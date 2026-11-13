// Keep the screen on with a recipe open (head chef, 14 Nov 2026, docs/keep-screen-on-options/brief.md). The browser's
// screen lock is stood in for: the stand-in counts the live locks and the requests, can refuse (battery saver) or answer
// late, and lets go when the page is hidden, as a phone does. Off until a cook taps it; one lock at a time; it lets go
// off the recipe pages, when the book is hidden, after 15 minutes without a touch and while a shared screen is locked;
// after a refusal only a tap or the book coming back on screen asks again. Not offered where the phone cannot do it.
const L = require('./lib');
const { R, ok } = L.results();

function STUB(o) {
  var st = window.__wl = { live: 0, asks: 0, refuse: !!o.refuse, delay: o.delay || 0, vis: 'visible' }, all = [];
  function make() {
    var s = new EventTarget(); s.type = 'screen'; s.released = false;
    s.release = function () { if (!s.released) { s.released = true; st.live--; s.dispatchEvent(new Event('release')); } return Promise.resolve(); };
    return s;
  }
  var lock = { request: function () {
    st.asks++;
    return new Promise(function (yes, no) {
      setTimeout(function () {
        if (st.refuse) return no(new DOMException('Battery saver', 'NotAllowedError'));
        var s = make(); st.live++; all.push(s); yes(s);
      }, st.delay);
    });
  } };
  if (o.none) delete Navigator.prototype.wakeLock;
  else Object.defineProperty(Navigator.prototype, 'wakeLock', { configurable: true, get: function () { return lock; } });
  if (o.homeScreen) Object.defineProperty(Navigator.prototype, 'standalone', { configurable: true, get: function () { return true; } });
  if (o.touchPoints) Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { configurable: true, get: function () { return o.touchPoints; } });
  Object.defineProperty(Document.prototype, 'visibilityState', { configurable: true, get: function () { return st.vis; } });
  Object.defineProperty(Document.prototype, 'hidden', { configurable: true, get: function () { return st.vis !== 'visible'; } });
  window.__hide = function (h) {
    st.vis = h ? 'hidden' : 'visible';
    if (h) all.forEach(function (s) { s.release(); });
    document.dispatchEvent(new Event('visibilitychange'));
  };
}
const init = o => '(' + STUB + ')(' + JSON.stringify(o || {}) + ')';
const PHONE = { touch: true, width: 390, height: 844, wait: 1200 };
const IPHONE = v => 'Mozilla/5.0 (iPhone; CPU iPhone OS ' + v + ' like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const IPAD_AS_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';

const st = p => p.evaluate(() => {
  const c = document.querySelector('.ko-chip');
  return {
    live: window.__wl ? __wl.live : null, asks: window.__wl ? __wl.asks : null,
    chip: c ? { pressed: c.getAttribute('aria-pressed'), name: c.getAttribute('aria-label'), words: [...c.querySelectorAll('.ko-off, .ko-on')].filter(s => getComputedStyle(s).visibility !== 'hidden').map(s => s.textContent.trim()).join('|'), w: Math.round(c.getBoundingClientRect().width), h: Math.round(c.getBoundingClientRect().height) } : null,
    say: (document.querySelector('.ko-say') || {}).textContent || '',
    saved: JSON.parse(localStorage.getItem('lk.settings.v1') || '{}').keepOn
  };
});
const top = (p, s) => p.evaluate(s => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : -1; }, s);
const go = async (p, h) => { await p.evaluate(h => { location.hash = h; }, h); await L.settle(p, 400); };
// a finger on the recipe, away from the chip
const touch = p => p.evaluate(() => document.querySelector('#rtitle').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
const J = x => JSON.stringify(x);

(async () => {
  const b = await L.start();

  // 1. A phone: off until tapped, one tap holds and is remembered, and every way it lets go and comes back
  let p = await L.open(b, '#/r/burger', Object.assign({ who: 'bo', init: init() }, PHONE));
  let s = await st(p);
  ok(s.chip && s.chip.pressed === 'false' && s.chip.words === 'Keep screen on' && s.chip.name === 'Keep screen on' && s.asks === 0 && s.live === 0, 'phone: Keep screen on shows, off until tapped, nothing asked (' + J(s) + ')');
  ok(s.chip && s.chip.h >= 44, 'phone: the chip is at least 44 px tall (' + J(s.chip) + ')');
  ok(await p.evaluate(() => {
    const t = document.querySelector('.ko-row nav.trail'), cur = t && t.querySelector('[aria-current="page"]');
    return !!t.querySelector('a[href="#/recipes"]') && t.querySelector('a[href="#/recipes"]').getBoundingClientRect().width > 20 && cur.textContent === 'Chicken Burger' && cur.getBoundingClientRect().width <= 1;
  }), 'phone: the trail keeps The pass and keeps the card\'s own name for screen readers only (the heading is right under it)');
  const phoneAt = [await top(p, '#rtitle'), await top(p, '#r-allergens')];
  ok(!(await L.overflow(p)), '390 px recipe with the chip: no sideways scroll ' + (await L.overflow(p) || ''));
  await p.click('.ko-chip'); await L.settle(p, 250);
  s = await st(p);
  ok(s.live === 1 && s.asks === 1 && s.chip.pressed === 'true' && s.chip.words === 'Screen on' && s.chip.name === 'Keep screen on' && s.saved === true, 'one tap: one lock, the chip says Screen on, saved on this phone (' + J(s) + ')');
  const onW = s.chip.w;
  await go(p, '#/r/rice'); s = await st(p);
  ok(s.live === 1 && s.asks === 1 && s.chip.pressed === 'true', 'another recipe: still the one lock, nothing asked again (' + J(s) + ')');
  await go(p, '#/recipes'); s = await st(p);
  ok(s.live === 0 && !s.chip, 'the recipe list: lets go, no chip (' + J(s) + ')');
  await go(p, '#/prep'); s = await st(p);
  ok(s.live === 0, 'Prep: the screen sleeps as normal (' + J(s) + ')');
  await go(p, '#/r/burger'); await L.settle(p, 250); s = await st(p);
  ok(s.live === 1 && s.asks === 2 && s.chip.pressed === 'true' && s.chip.w === onW, 'back on a recipe: asks by itself, Screen on, the chip the same width (' + J(s) + ')');
  await p.evaluate(() => __hide(true)); await L.settle(p, 200); s = await st(p);
  ok(s.live === 0 && s.chip.pressed === 'false', 'book hidden (side button, another app): the phone let go and the chip says so (' + J(s) + ')');
  await p.evaluate(() => __hide(false)); await L.settle(p, 300); s = await st(p);
  ok(s.live === 1 && s.chip.pressed === 'true', 'back on screen: asks again by itself (' + J(s) + ')');
  await p.clock.runFor(14 * 60000); await touch(p); await p.clock.runFor(14 * 60000); await L.settle(p, 200); s = await st(p);
  ok(s.live === 1, 'a touch after 14 minutes starts the 15 again: still on after 28 minutes (' + J(s) + ')');
  await p.clock.runFor(60000 + 1000); await L.settle(p, 200); s = await st(p);
  ok(s.live === 0 && s.chip.pressed === 'false' && s.chip.words === 'Keep screen on' && s.saved === true, '15 minutes without a touch: lets go, the chip says Keep screen on, the choice is kept (' + J(s) + ')');
  await touch(p); await L.settle(p, 300); s = await st(p);
  ok(s.live === 1 && s.chip.pressed === 'true', 'the next touch: holds it again (' + J(s) + ')');
  await p.reload(); await L.settle(p, 1500); s = await st(p);
  ok(s.live === 1 && s.chip && s.chip.pressed === 'true', 'reloaded: remembered on this phone, on again (' + J(s) + ')');
  await p.click('.ko-chip'); await L.settle(p, 250); s = await st(p);
  ok(s.live === 0 && s.chip.pressed === 'false' && s.chip.words === 'Keep screen on' && s.saved === false, 'tap Screen on: lets go at once, Keep screen on, saved off (' + J(s) + ')');
  const asked = s.asks;
  await go(p, '#/r/rice'); s = await st(p);
  ok(s.live === 0 && s.asks === asked, 'off: another recipe asks nothing (' + J(s) + ')');
  ok(p.errors.length === 0, 'phone: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the same page where the phone cannot do it: the name and allergens are where they are with the chip (no line lost)
  p = await L.open(b, '#/r/burger', Object.assign({ who: 'bo', init: init({ none: true }) }, PHONE));
  s = await st(p);
  const plainAt = [await top(p, '#rtitle'), await top(p, '#r-allergens')];
  ok(!s.chip && await p.evaluate(() => !!document.querySelector('nav.trail [aria-current="page"]') && document.querySelector('nav.trail [aria-current="page"]').getBoundingClientRect().width > 20), 'no screen lock in this browser: no chip, the trail as before');
  ok(J(plainAt) === J(phoneAt), '390 px: the chip moves nothing, name and allergens at ' + J(phoneAt) + ' (without it ' + J(plainAt) + ')');
  await p.context().close();

  // 2. The phone says no: words after a tap, one request however many touches, asks again once the book is back on screen
  p = await L.open(b, '#/r/burger', Object.assign({ who: 'bo', init: init({ refuse: true }) }, PHONE));
  await p.click('.ko-chip'); await L.settle(p, 250); s = await st(p);
  ok(s.live === 0 && s.asks === 1 && s.chip.pressed === 'false' && /This phone will not keep the screen on\. Battery saver may be on\./.test(s.say), 'refused after a tap: it says so in words and the chip stays off (' + J(s) + ')');
  ok(await p.evaluate(() => document.querySelector('.ko-say').getAttribute('role') === 'alert'), 'refused: the words are read out');
  for (let i = 0; i < 20; i++) await touch(p);
  await L.settle(p, 300); s = await st(p);
  ok(s.asks === 1, '20 touches after a refusal: still one request (' + J(s) + ')');
  await go(p, '#/r/rice'); s = await st(p);
  ok(s.asks === 1 && !s.say, 'another recipe after a refusal: the words go, nothing asked (' + J(s) + ')');
  await p.evaluate(() => __hide(true)); await p.evaluate(() => __hide(false)); await L.settle(p, 300); s = await st(p);
  ok(s.asks === 2 && s.live === 0 && !s.say && s.chip.pressed === 'false', 'back on screen: asks once more, and a refusal nobody tapped for stays quiet (' + J(s) + ')');
  await p.evaluate(() => { __wl.refuse = false; }); await p.click('.ko-chip'); await L.settle(p, 250); s = await st(p);
  ok(s.live === 1 && s.chip.pressed === 'true' && !s.say, 'battery saver off, a tap: Screen on (' + J(s) + ')');
  ok(p.errors.length === 0, 'refused: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 3. Two quick taps while the phone takes its time: one request, one lock
  p = await L.open(b, '#/r/burger', Object.assign({ who: 'bo', init: init({ delay: 400 }) }, PHONE));
  await p.click('.ko-chip'); await p.click('.ko-chip'); await L.settle(p, 900); s = await st(p);
  ok(s.live === 1 && s.asks === 1 && s.chip.pressed === 'true', 'two quick taps with a slow answer: one request, one lock, Screen on (' + J(s) + ')');
  await p.context().close();

  // 4. A shared screen: its 10-minute idle lock lets go of the screen too
  p = await L.open(b, '#/r/burger', Object.assign({ who: 'ann', deviceMode: 'shared', settings: { keepOn: true }, init: init() }, PHONE));
  await L.settle(p, 300); s = await st(p);
  ok(s.live === 1 && s.chip.pressed === 'true', 'shared screen, chosen before: on a recipe it holds (' + J(s) + ')');
  await p.clock.runFor(12 * 60000); await L.settle(p, 600); s = await st(p);
  ok(await p.evaluate(() => !!(window.LK_PREP && LK_PREP.workLock())) && s.live === 0, 'shared screen idle lock (12 minutes, before the 15): lets go (' + J(s) + ')');
  ok(p.errors.length === 0, 'shared: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 5. A Tiles card: the chip on the card's own trail, nothing moved
  const tilesAt = [];
  for (const none of [false, true]) {
    p = await L.open(b, '#/r/burger', Object.assign({ who: 'bo', settings: { view: 'tiles' }, init: init({ none }) }, PHONE));
    tilesAt.push(J([await top(p, '#rtitle'), await top(p, '#r-allergens')]));
    const chip = await p.$('.card .ko-row .ko-chip');
    ok(none ? !chip : !!chip && !(await L.overflow(p)), none ? 'Tiles card where the phone cannot: no chip' : 'Tiles card: the chip on the card\'s own trail, no sideways scroll');
    await p.context().close();
  }
  ok(tilesAt[0] === tilesAt[1], 'Tiles card: the chip moves nothing, name and allergens at ' + tilesAt.join(' and '));

  // 6. Where it is offered: a touch screen with the screen lock; never a laptop, an old iPhone or a version-less iPad home-screen app
  p = await L.open(b, '#/r/burger', { who: 'bo', width: 1280, height: 900, wait: 1000, init: init() });
  ok(!(await p.$('.ko-chip')), 'laptop with a mouse: no chip');
  await go(p, '#/settings');
  ok(!(await p.$('[data-row="keepon"]')), 'laptop: no Settings row');
  await p.context().close();
  for (const [ua, extra, want, name] of [[IPHONE('17_5'), { homeScreen: true }, false, 'iPhone home-screen app, iOS 17.5'], [IPHONE('18_4'), { homeScreen: true }, true, 'iPhone home-screen app, iOS 18.4'],
    [IPHONE('17_5'), {}, true, 'iPhone Safari, iOS 17.5'], [IPAD_AS_MAC, { homeScreen: true, touchPoints: 5 }, false, 'iPad home-screen app with no version']]) {
    p = await L.open(b, '#/r/burger', Object.assign({ who: 'bo', ua, init: init(extra) }, PHONE));
    ok(!!(await p.$('.ko-chip')) === want, name + ': ' + (want ? 'offered' : 'not offered'));
    await p.context().close();
  }
  p = await L.open(b, '#/r/burger', Object.assign({}, PHONE, { who: 'bo', width: 768, height: 1024, init: init() }));
  ok(!!(await p.$('.ko-chip')) && await p.evaluate(() => document.querySelector('nav.trail [aria-current="page"]').getBoundingClientRect().width > 20) && !(await L.overflow(p)), 'tablet 768 px: the chip and the whole trail, no sideways scroll');
  await p.context().close();

  // 7. Settings, This phone: the same switch
  p = await L.open(b, '#/settings', Object.assign({ who: 'bo', init: init() }, PHONE));
  ok(await p.evaluate(() => { const r = document.querySelector('[data-row="keepon"]'); return !!r && /Keep the screen on with a recipe open/.test(r.textContent) && r.querySelector('.st-v').textContent.trim() === 'Off'; }), 'Settings: Keep the screen on with a recipe open, Off');
  await p.click('#st-h-keepon'); await L.settle(p, 150);
  await p.click('[data-act="setkeepon"][data-val="1"]'); await L.settle(p, 300);
  s = await st(p);
  ok(s.saved === true && await p.evaluate(() => document.querySelector('[data-row="keepon"] .st-v').textContent.trim() === 'On'), 'Settings: On saves the same choice and the row says On (' + J(s) + ')');
  await go(p, '#/r/burger'); await L.settle(p, 250); s = await st(p);
  ok(s.live === 1 && s.chip.pressed === 'true', 'then a recipe: Screen on without a tap (' + J(s) + ')');
  ok(p.errors.length === 0, 'settings: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
