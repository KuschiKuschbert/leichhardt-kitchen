/*
  Shared setup for the click tests: Chrome through playwright-core, a stand-in for Firebase, and seed data.

  The prep pages talk to Firestore. The tests never do: every request for the Firebase SDK is answered with the
  small stand-ins in tests/fake/, which keep the data in the page's localStorage. So no real kitchen PIN, staff
  names or prep lines are needed, and nothing is written to the real book, even when BASE points at the live site.

  Every page opens at 14:00 today, kitchen time (the clock then runs as normal), so time-of-day features such as the
  10:30 notes popup behave the same whenever the tests are run. The tests and the browser run in kitchen time
  (Queensland), whatever zone the computer is set to.
*/
process.env.TZ = 'Australia/Brisbane';
const { chromium } = require('playwright-core');
// the service worker's own requests go through each page's routes too (the Firebase stand-in), where a test lets the
// worker run (tests/saved-copy.test.js). Read by Playwright where Chrome is started: here, or in run.js, which loads this
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
const crypto = require('crypto'), fs = require('fs'), path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8777/';
const FAKE = path.join(__dirname, 'fake');
const PDFJS = path.join(__dirname, 'node_modules', 'pdfjs-dist') + path.sep;
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const PIN = '000000';   // the stand-in kitchen PIN: 6 digits, so it can never be the real one (always 4)
const K = ['kitchens', PIN];
const NOW = Date.parse(new Date(Date.now() + 10 * 3600000).toISOString().slice(0, 10) + 'T04:00:00Z'); // 14:00 Brisbane, independent of the runner timezone
function ymd(d) { const p = n => (n < 10 ? '0' : '') + n; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }

/* Three made-up people: Sam (sous chef, PIN 1111), Ann and Bo (staff, 2222 and 3333), their usual drinks, today's prep
   lines in three sections, two order lines and one wastage entry. "extra" adds or replaces documents (undefined removes one). */
function seed(extra) {
  const today = ymd(new Date(NOW)), s = {}, put = (p, v) => { s[K.concat(p).join('/')] = v; };
  const people = [
    { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
    { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
    { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, active: true }
  ];
  // The usual fixture has launched Cleaning. A replacement config may omit the flag to test its production default.
  put(['config', 'main'], { people, sousIds: ['sam'], showBadges: true, staffSee: { cleaning: true } });
  put(['config', 'admins'], { x: 1 });
  [['sam', '1111'], ['ann', '2222'], ['bo', '3333']].forEach(([id, pin]) => { put(['staffpins', id], { hash: sha('lk:' + id + ':' + pin) }); put(['pinset', id], { at: 1 }); });
  // everyone already has a usual drink, so the drinks run card does not show on every page (drinks.test.js takes them away)
  put(['drinks', 'sam'], { kind: 'long', size: 'large', milk: '', shot: 'extra', sugar: '', note: '', other: '', at: NOW - 86400000, by: 'sam' });
  put(['drinks', 'ann'], { kind: 'flat', size: 'reg', milk: 'oat', shot: '', sugar: '1', note: '', other: 'Coke No Sugar', at: NOW - 86400000, by: 'ann' });
  put(['drinks', 'bo'], { kind: 'flat', size: 'reg', milk: 'oat', shot: '', sugar: '1', note: '', other: '', at: NOW - 86400000, by: 'bo' });
  const items = [
    ['i1', 'Slice onions', 'Larder', '2 tubs', {}], ['i2', 'Pick coriander', 'Larder', '', {}], ['i3', 'Portion rump', 'Grill', '20', { urgent: true }],
    ['i4', 'Make gravy', 'Sauce', '5 L', { rolled: 1 }], ['i5', 'Laksa', 'Sauce', '1 batch', {}], ['i6', 'Wash bok choy', 'Larder', '', {}]
  ];
  items.forEach(([id, text, station, qty, x], k) => put(['days', today, 'items', id], Object.assign({ text, station, qty, recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: NOW - (60 - k) * 60000, done: false, deleted: false }, x)));
  put(['orders', today, 'lines', 'o1'], { text: 'Milk', qty: '6 L', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: NOW - 3600000, ordered: false, deleted: false });
  put(['orders', today, 'lines', 'o2'], { text: 'Brioche buns', qty: '4 packs', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: NOW - 3000000, ordered: false, deleted: false });
  put(['waste', today, 'lines', 'w1'], { text: 'Chips', amount: 2, unit: 'kg', reason: 'excess', action: '', station: 'Fryer', addedBy: 'Bo', addedById: 'bo', addedAt: NOW - 1800000, deleted: false });
  Object.assign(s, extra || {});
  const cfg = s[K.concat(['config', 'main']).join('/')];
  // Deployed kitchens keep canonical active membership through access-bootstrap and staff saves.
  if (!Array.isArray(cfg.staffIds)) cfg.staffIds = (cfg.people || []).filter(p => p.active !== false).map(p => p.id);
  cfg.fnOnlyIds = cfg.fnOnlyIds || (cfg.people || []).filter(p => p.active !== false && p.role === 'fnc').map(p => p.id);
  // Synthetic deployed configuration includes the owner-approved capability foundation. Explicit missing lists are tested separately.
  ['add', 'tick', 'del'].forEach(cap => { if (cfg[cap + 'Ids'] === undefined) cfg[cap + 'Ids'] = (cfg.people || []).filter(p => p.active !== false && cfg.staffIds.includes(p.id) && !cfg.fnOnlyIds.includes(p.id) && (p.id === cfg.headId || p[cap] === true)).map(p => p.id); });
  s[K.concat(['login', 'roster']).join('/')] = Object.fromEntries(['people', 'staffIds', 'sousIds', 'headId', 'fnIds', 'fnOnlyIds'].filter(k => cfg[k] !== undefined).map(k => [k, cfg[k]]));
  // Synthetic deployed bookings receive the same additive preparation as production before capability rules.
  Object.entries(s).forEach(([path, f]) => { if (/^kitchens\/[^/]+\/functions\/[^/]+$/.test(path) && f) { if (!f.effects) f.effects = require('../js/functions').effects(f, path.split('/').pop()); } });
  return s;
}

/* The nightly wastage summary (summary/waste, 22 Oct 2026) as the server writes it: one entry per item, for "extra".
   items: [{ t, n, r: { reason: count }, unit, reason, sec, amt, last: { unit, reason, sec, amt } }], made for today. */
function wasteSum(items) { const x = {}; x[K.concat(['summary', 'waste']).join('/')] = { day: ymd(new Date(NOW)), items, at: NOW - 3600000 }; return x; }

/* A tiny picture (4 x 6 px, orange over black) for guide pages, and two made-up guides: "combi" (Equipment, two pages,
   the search word iCombi and the words "Pork Belly" read from its PDF) and "fryer" (Cleaning, written steps only),
   plus a removed one that must never show. */
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAGCAIAAABrW6giAAAAF0lEQVR4nGN4lKAFRwy4OTKy8nCEmwMAP54VMW8NxTYAAAAASUVORK5CYII=';
function guides() {
  const g = {}, put = (p, v) => { g[K.concat(['guides']).concat(p).join('/')] = v; };
  put(['combi'], { title: 'iCombi: programme a new recipe', cat: 'equipment', sum: 'Set up any new dish as a programme.', steps: '', kw: 'iCombi', text: 'Programme a new recipe. Example: PORK BELLY. Press the dial to confirm.', thumb: PNG, pages: 2, dims: [{ w: 4, h: 6 }, { w: 4, h: 6 }], v: 1, file: 'combi.pdf', removed: false, at: NOW - 3600000, upd: NOW - 3600000 });
  put(['combi', 'pages', '0'], { img: PNG, w: 4, h: 6, v: 1, n: 0 });
  put(['combi', 'pages', '1'], { img: PNG, w: 4, h: 6, v: 1, n: 1 });
  put(['fryer'], { title: 'Fryer oil change', cat: 'cleaning', sum: 'Drain, clean and refill the fryer.', steps: 'Turn the fryer off and let the oil cool.\nDrain the oil into the caddy.\nWipe the basin and refill to the line.', kw: '', text: '', thumb: '', pages: 0, dims: [], v: 1, file: '', removed: false, at: NOW - 30 * 86400000, upd: NOW - 20 * 86400000 });
  put(['gone'], { title: 'Old slicer guide', cat: 'equipment', sum: '', steps: 'Gone.', kw: '', text: '', thumb: '', pages: 0, dims: [], v: 1, file: '', removed: true, at: NOW - 40 * 86400000, upd: NOW - 40 * 86400000 });
  return g;
}

/* Three made-up kitchen mails to the head chef: an equipment one for today from Ann (11 hours old), a food safety one
   from Bo whenever (2 hours old) and an idea from Sam this week, all open and unseen. */
function mail() {
  const m = {}, put = (id, v) => { m[K.concat(['mail', id]).join('/')] = Object.assign({ done: false, seen: false }, v); m[K.concat(['mailstat', id]).join('/')] = { seen: false, done: false, by: v.from }; };
  put('m1', { from: 'ann', by: 'ann', cat: 'equipment', pri: 'today', text: 'Fryer 2 thermostat reads 20 degrees low', at: NOW - 11 * 3600000 });
  put('m2', { from: 'bo', by: 'bo', cat: 'safety', pri: 'any', text: 'Cool room door seal is torn at the bottom', at: NOW - 2 * 3600000 });
  put('m3', { from: 'sam', by: 'sam', cat: 'idea', pri: 'week', text: 'Pickle the leftover red onion for the burgers', at: NOW - 5 * 3600000 });
  return m;
}

/* Settling instead of fixed pauses (21 Oct 2026). Every page counts its own changes: each change to the page, each timer
   that is still to run, each scroll and each short animation still playing. settle(page, ms) waits at most
   ms, like page.waitForTimeout(ms), but returns as soon as the page has had nothing to do for QUIET ms, has nothing
   loading (open() counts the page's requests, the Firebase stand-in's imports among them) and has no timer due inside
   the ms it was given. So a pause that was there for a redraw ends when the redraw is done, and a pause that
   was there for a timer (a toast, a retry, a debounced save) still waits for that timer. */
const QUIET = 120;
function track() {
  if (window.__lkSettle) return;
  const st = window.__lkSettle = { muts: 0, timers: new Map(), idle: new Map() };
  const now = () => performance.now();
  new MutationObserver(() => { st.muts++; }).observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
  const sT = window.setTimeout, cT = window.clearTimeout;
  window.setTimeout = function (fn, ms) {
    const args = [].slice.call(arguments, 2);
    const id = sT.call(window, function () { st.timers.delete(id); if (typeof fn === 'function') fn.apply(this, args); }, ms);
    st.timers.set(id, now() + (+ms || 0));
    return id;
  };
  window.clearTimeout = function (id) { st.timers.delete(id); return cT.call(window, id); };
  // an idle callback is a timer too (opening Recipes draws its other groups in them): due by its timeout, at most 50 ms
  if (window.requestIdleCallback) {
    const sI = window.requestIdleCallback, cI = window.cancelIdleCallback;
    window.requestIdleCallback = function (fn, o) {
      const id = sI.call(window, function () { st.idle.delete(id); if (typeof fn === 'function') return fn.apply(this, arguments); }, o);
      st.idle.set(id, now() + Math.min(50, (o && o.timeout) || 50));
      return id;
    };
    window.cancelIdleCallback = function (id) { st.idle.delete(id); return cI.call(window, id); };
  }
  // a scroll (a smooth jump to the method) is a change too, while it moves
  window.addEventListener('scroll', () => { st.muts++; }, { capture: true, passive: true });
  // busy: anything that would still change the page before the time "until" (on the page's own clock)
  st.check = until => {
    let busy = false;
    for (const due of st.timers.values()) if (due <= until) { busy = true; break; }
    for (const due of st.idle.values()) if (due <= until) { busy = true; break; }
    if (!busy && document.getAnimations) busy = document.getAnimations().some(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations !== Infinity);
    return { muts: st.muts, busy };
  };
  st.at = () => now();
}
const sleep = ms => new Promise(r => setTimeout(r, Math.max(0, ms)));
async function settle(page, ms, still, ready) {
  still = still || QUIET;
  const t0 = Date.now(), end = t0 + ms;
  let until = null, muts = -1, quiet = t0;
  for (;;) {
    let r = null;
    try {
      if (until === null) until = await page.evaluate(ms => (window.__lkSettle ? window.__lkSettle.at() + ms : null), ms);
      if (until !== null) r = await page.evaluate(u => window.__lkSettle.check(u), until);
      if (r && ready && !(await page.evaluate(ready))) r.busy = true;
    } catch (e) { r = null; until = null; }   // the page is loading again (a reload or a new hash): keep waiting
    const t = Date.now();
    if (t >= end) return;
    if (r && page.loading > 0) r.busy = true;
    if (!r) { muts = -1; quiet = t; }
    else if (r.muts !== muts) { muts = r.muts; quiet = t; }
    else if (!r.busy && t - quiet >= still) return;
    await sleep(Math.min(25, end - t));
  }
}

/* Installed Google Chrome by default. CHROME=/path/to/chrome uses another Chromium (for example on a server).
   run.js starts one Chrome for the whole run and passes its address in LK_WS, so each file connects to it instead of
   starting its own (each page still gets a fresh profile). A file run on its own (node recipes.test.js) starts one. */
function chromeOpts() {
  // scrollbars are hidden like on a phone or tablet (overlay scrollbars): a classic 15 px scrollbar at exactly 768 px would
  // put the tablet layout in a 753 px window and count as sideways scroll
  return process.env.CHROME ? { executablePath: process.env.CHROME, headless: true, args: ['--hide-scrollbars'] } : { channel: 'chrome', headless: true, args: ['--hide-scrollbars'] };
}
// Isolate a finished context before removing its stand-ins: a pending update may still navigate.
// Ignore already active route callbacks only during teardown, then close pages before context disposal.
async function unrouteForClose(ctx) {
  await ctx.setOffline(true);
  const pages = ctx.pages().filter(p => !p.isClosed());
  await Promise.all([ctx.unrouteAll({ behavior: 'ignoreErrors' }), ...pages.map(p => p.unrouteAll({ behavior: 'ignoreErrors' }))]);
  await Promise.all(pages.filter(p => !p.isClosed()).map(p => p.close({ runBeforeUnload: false })));
}
async function start() {
  const b = await (process.env.LK_WS ? chromium.connect(process.env.LK_WS) : chromium.launch(chromeOpts()));
  const rawNewContext = b.newContext.bind(b), rawBrowserClose = b.close.bind(b);
  b.newContext = async opts => {
    const ctx = await rawNewContext(opts), rawClose = ctx.close.bind(ctx);
    let closing, closed = false;
    ctx.on('close', () => { closed = true; });
    ctx.close = opts => closed ? rawClose(opts) : closing || (closing = (async () => { await unrouteForClose(ctx); return rawClose(opts); })());
    return ctx;
  };
  let closing;
  b.close = opts => closing || (closing = (async () => { await Promise.all(b.contexts().map(unrouteForClose)); return rawBrowserClose(opts); })());
  return b;
}

/* Opens one page in a fresh browser profile.
   o.width, o.height  viewport (390 x 844 by default, a phone)
   o.who              who is signed in on this phone: 'sam' (default), 'ann', 'bo', or '' for the name screen
   o.noTok            the person is picked but has to type their own PIN
   o.oldTok           legacy PIN proof only, with no v2 session: the daily PIN must be entered again
   o.noAnon           the phone's Firebase sign-in fails (no signal on a first start): no uid, so no session
   o.noPin            no kitchen PIN on this phone yet
   o.admin            a verified daily head-PIN session and matching device grant, with remembered secondary Google
                      (adds a dedicated synthetic head only when the fixture has none)
   o.bootstrapOwner   Google-only first setup: no daily PIN session or operational admin grant
   o.ownerGoogle      explicitly seed or omit the secondary remembered Google login
   o.deviceMode       'personal' (default) or 'shared'; shared Google uses sessionStorage
   o.profile          explicit lk.device.v2 profile; null (or deviceUnclassified:true) leaves the choice unmade
   o.dailyLocked      omit the daily PIN session while retaining profile/Google as appropriate
   o.legacyPrimaryGoogle  old default-app Google identity for the one-time anonymous-device migration
   o.settings         saved recipe book settings, for example { view: 'tiles' }
   o.seasonal         seasonal preferences; other journeys default Off for date-independent navigation
   o.extra            more seed documents (see seed)
   o.base             the book's address for this page (BASE by default)
   o.sw               let the service worker run (it is blocked otherwise, so each page loads the files fresh)
   o.touch            a touch screen
   o.ua               the browser's user agent string (Windows, Mac, Firefox and so on)
   o.clock            the phone's clock when the page opens (NOW by default)
   o.tz               the phone's time zone (kitchen time by default)
   o.server           the server's time when the page opens; without it the update check's answer has no Date,
                      so the book keeps the phone's clock (LK_TIME in index.html)
   o.fakeServer       documents the "server" holds newer copies of than the phone (path: data), for getDocFromServer
   o.fakeMode         the stand-in's mode from the first request: 'fail' (every write and every read from the server fails;
                      getDoc, getDocs and listeners still answer, so it is not no signal: that is o.cold), 'hold' or 'deny'
   o.failReads        a regex source: getDoc and getDocs fail for the paths that match (say one past day of wastage)
   o.denyReads        a regex source: getDocs is refused (permission-denied) for the collections that match
   o.exhausted        a regex source: every read and listener on the paths that match is refused with resource-exhausted,
                      like the free plan's 50,000 reads a day used up (5 Nov 2026)
   o.cold             a regex source: no signal for the paths that match, the way the book's memory cache answers it
                      (__fake.cold in tests/fake/firebase-firestore.js); with fakeMode 'hold' writes wait too.
                      __fake.warm() in the page brings the signal back
   o.init             a function run in the page before the book starts, on every load (after the seed), to stand in
                      for what the test browser lacks (the notification permission, a running service worker)
   o.fakeSDK          replacement source by Firebase stand-in basename, for controlled SDK response ordering
   o.block            a regex source: the book's own files whose address matches fail to load (say js/cutoffs.js)
   o.hold             a regex source: the book's own files whose address matches never answer, like a slow live site
                      (say the supplier tools the order list loads for a chef)
   o.board            let the start of shift sheet come up (23 Oct 2026). Without it the phone has had today's start
                      already (lk.board.<who>), the way everyone has a usual drink, so the sheet stays off the other tests */
async function open(browser, hash, o) {
  o = o || {};
  const w = o.width || 390, h = o.height || 844, base = o.base || BASE;
  const ctx = await browser.newContext(Object.assign({ viewport: { width: w, height: h }, serviceWorkers: o.sw ? 'allow' : 'block', hasTouch: !!o.touch, deviceScaleFactor: 1, timezoneId: o.tz || 'Australia/Brisbane' }, o.ua ? { userAgent: o.ua } : {}));
  // a click or a wait that has not worked in 10 s is not going to: fail then, not after Playwright's 30 s
  ctx.setDefaultTimeout(10000);
  await ctx.clock.install({ time: o.clock || NOW });
  await ctx.addInitScript(track);
  const opened = Date.now();
  await ctx.route(u => u.href === base + 'index.html', async r => {
    if (r.request().method() !== 'HEAD') return r.continue();
    const res = await r.fetch(), hd = Object.assign({}, res.headers());
    delete hd.date;
    if (o.server) hd.date = new Date(o.server + Date.now() - opened).toUTCString();
    return r.fulfill({ status: res.status(), headers: hd });
  });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => {
    const f = path.join(FAKE, path.basename(new URL(r.request().url()).pathname));
    if (fs.existsSync(f)) return r.fulfill({ status: 200, contentType: 'text/javascript', body: o.fakeSDK && typeof o.fakeSDK[path.basename(f)] === 'string' ? o.fakeSDK[path.basename(f)] : fs.readFileSync(f, 'utf8') });
    return r.fulfill({ status: 200, contentType: 'text/javascript', body: 'export {}' });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, body: '' }));
  // pdf.js (the admin Guides tab reads PDFs with it) comes from the copy installed with the tests, not the internet
  await ctx.route(/^https:\/\/cdn\.jsdelivr\.net\/npm\/pdfjs-dist@[^/]+\//, r => {
    const rel = new URL(r.request().url()).pathname.replace(/^\/npm\/pdfjs-dist@[^/]+\//, ''), f = path.join(PDFJS, rel);
    if (!f.startsWith(PDFJS) || !fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
    return r.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*' }, contentType: /\.m?js$/.test(f) ? 'text/javascript' : 'application/octet-stream', body: fs.readFileSync(f) });
  });
  const pins = { sam: '1111', ann: '2222', bo: '3333', fay: '5151', finn: '5252', head: '4444' };
  const store = seed(o.extra), configKey = K.concat(['config', 'main']).join('/');
  let config = store[configKey];
  // Ordinary owner journeys represent an actual daily head unlock. Bootstrap tests explicitly retain no head.
  if (o.admin && !o.bootstrapOwner && !config.headId) {
    let id = 'head'; while ((config.people || []).some(p => p.id === id)) id = 'owner-' + id;
    pins[id] = '4444';
    config = { ...config, people: (config.people || []).concat([{ id, name: 'Head chef', role: 'head', active: true, add: true, tick: true, del: true, ping: true }]),
      headId: id, staffIds: (config.staffIds || []).concat([id]), sousIds: (config.sousIds || []).concat([id]), pingIds: (config.pingIds || []).concat([id]) };
    store[configKey] = config;
  }
  const who = o.admin && !o.bootstrapOwner && !o.who ? config.headId : o.who === undefined ? (o.bootstrapOwner ? '' : 'sam') : o.who;
  if (o.admin && config.headId) {
    const id = config.headId;
    if (!store[K.concat(['pinset', id]).join('/')]) store[K.concat(['pinset', id]).join('/')] = { at: 1 };
    if (!store[K.concat(['staffpins', id]).join('/')]) store[K.concat(['staffpins', id]).join('/')] = { hash: sha('lk:' + id + ':' + (pins[id] || '4444')) };
  }
  store[K.concat(['login', 'roster']).join('/')] = Object.fromEntries(['people', 'staffIds', 'sousIds', 'headId', 'fnIds', 'fnOnlyIds'].filter(k => config[k] !== undefined).map(k => [k, config[k]]));
  const clock = o.clock || NOW, serverClock = o.server || clock, uid = o.deviceUid || 'anon-test';
  if (o.admin && config.headId) {
    const drinkKey = K.concat(['drinks', config.headId]).join('/');
    if (!Object.hasOwn(o.extra || {}, drinkKey) && !store[drinkKey]) store[drinkKey] = { kind: 'flat', size: 'reg', at: serverClock - 86400000, by: config.headId };
  }
  const mode = o.deviceMode === 'shared' || o.settings && o.settings.shared ? 'shared' : 'personal';
  const issuedAt = o.sessionIssuedAt === undefined ? serverClock - 1000 : o.sessionIssuedAt;
  const exp = o.sessionExp === undefined ? (Math.floor((issuedAt + 6 * 3600000) / 86400000) + 1) * 86400000 - 6 * 3600000 : o.sessionExp;
  const timestamp = value => ({ __fakeTimestamp: value });
  const pinAt = who && (store[K.concat(['pinset', who]).join('/')] || {}).at;
  const sess = who && !o.noTok && !o.oldTok && !o.noAnon && !o.dailyLocked && !o.legacyPrimaryGoogle && typeof pinAt === 'number';
  if (sess) store[K.concat(['sessions', uid]).join('/')] = { by: who, pinAt, exp, at: timestamp(issuedAt), issuedAt: timestamp(issuedAt), mode, v: 2 };
  const google = o.ownerGoogle === undefined ? !!(o.admin || o.bootstrapOwner) : !!o.ownerGoogle;
  const googleUser = { uid: 'owner', email: 'headchef@test.local', emailVerified: true, isAnonymous: false, authTime: Math.floor(serverClock / 1000), ...(o.googleUser || {}) };
  if (sess && who === config.headId && o.adminGrant !== false && (google || o.adminGrant && typeof o.adminGrant === 'object')) {
    store[K.concat(['adminDevices', uid]).join('/')] = { by: who, pinAt, issuedAt: timestamp(issuedAt), exp, googleUid: googleUser.uid, at: timestamp(serverClock), v: 2, ...(o.adminGrant || {}) };
  }
  const ls = {
    // Existing journeys use a returning admin whose last page was Insights. Set adminPage: '' to test a first visit.
    'lk.prep.atab': o.adminPage === undefined ? 'insights' : o.adminPage,
    // The Dashboard has opened once on this device, so the last page is kept. Set dashIntro: true for a first update.
    'lk.dash.intro': o.dashIntro ? '' : '1',
    'fake.fs': JSON.stringify(store),
    'fake.anon': o.noAnon || o.legacyPrimaryGoogle ? '' : uid,
    'lk.prep.pin': o.noPin ? '' : PIN,
    'lk.prep.who': who || '',
    'lk.prep.tok': who && o.oldTok ? who + ':' + sha('lk:' + who + ':' + pins[who]) : '',
    'lk.prep.sess': sess ? JSON.stringify({ v: 2, by: who, exp, uid, pinAt, issuedAt, mode }) : '',
    'lk.prep.seen': String(clock),   // on the phone's clock, like the idle check
    'lk.settings.v1': JSON.stringify(Object.assign({ installNo: true }, o.settings || {})),
    'lk.seasonal.v1': JSON.stringify(o.seasonal || { selection: 'off' })
  };
  if (!(o.deviceUnclassified || o.deviceMode === 'unclassified' || o.profile === null)) ls['lk.device.v2'] = JSON.stringify(o.profile || { v: 2, mode, ownerId: mode === 'personal' ? who || '' : '' });
  if (!o.board) ['sam', 'ann', 'bo', 'fay', 'finn'].concat((config.people || []).map(p => p.id), who ? [who] : []).forEach(id => { ls['lk.board.' + id] = ymd(new Date(serverClock)); });
  const ss = {};
  if (google && !o.legacyPrimaryGoogle) (mode === 'shared' ? ss : ls)['fake.auth.kitchen-owner.user'] = JSON.stringify(googleUser);
  if (o.legacyPrimaryGoogle) ls['fake.user'] = '1';
  if (o.noAnon) await ctx.addInitScript(() => { window.__fakeNoAnon = true; });
  if (o.fakeServer || o.fakeMode || o.failReads || o.denyReads || o.cold || o.exhausted) await ctx.addInitScript(f => { window.__fake = { mode: f.mode || 'ok', writes: [], reads: [], server: f.server, failReads: f.fail ? new RegExp(f.fail) : null, denyReads: f.deny ? new RegExp(f.deny) : null, cold: f.cold ? new RegExp(f.cold) : null, exhausted: f.spent ? new RegExp(f.spent) : null }; }, { mode: o.fakeMode, server: o.fakeServer, fail: o.failReads, deny: o.denyReads, cold: o.cold, spent: o.exhausted });
  // Seed once per profile. A second tab must retain the real device identity and remembered personal Google login.
  await ctx.addInitScript(({ ls, ss, offset }) => {
    window.__fakeServerOffset = offset;
    if (!localStorage.getItem('fake.profile.seeded')) {
      localStorage.clear(); Object.keys(ls).forEach(k => { if (ls[k]) localStorage.setItem(k, ls[k]); });
      Object.keys(ss).forEach(k => sessionStorage.setItem(k, ss[k])); localStorage.setItem('fake.profile.seeded', '1');
    }
    sessionStorage.setItem('seeded', '1');
  }, { ls, ss, offset: serverClock - clock });
  if (o.init) await ctx.addInitScript(o.init);
  if (o.block) await ctx.route(new RegExp(o.block), r => r.abort());
  if (o.hold) await ctx.route(new RegExp(o.hold), () => new Promise(() => {}));
  const page = await ctx.newPage();
  page.errors = [];
  // Prep's add form is in the Add a line sheet since 3 Nov 2026 (work pages redesign A). A test that reaches for one of its
  // boxes by selector while the sheet is closed taps Add a line first, the way a cook does. page.$ is left alone, so a check
  // that the form is not there still means it; tests of the sheet itself use L.pLog() (tests/prep-a.test.js). A click on
  // the page behind an open Add a line sheet closes the sheet first, the way a cook does (prepAway). The same for the
  // order list's Add a line sheet (L.oLog(), tests/orders-a.test.js).
  for (const m of ['fill', 'press', 'type', 'focus', 'click', 'tap', 'inputValue', 'getAttribute', '$eval']) {
    const orig = page[m].bind(page);
    page[m] = async (sel, ...rest) => {
      if (typeof sel === 'string' && PREP_FORM.test(sel)) await prepForm(page, sel);
      else if (typeof sel === 'string' && (m === 'click' || m === 'tap')) await prepAway(page, sel);
      return orig(sel, ...rest);
    };
  }
  const origLocator = page.locator.bind(page);
  page.locator = (sel, ...rest) => {
    const loc = origLocator(sel, ...rest);
    if (typeof sel !== 'string' || !PREP_FORM.test(sel)) return loc;
    // count() is left alone, like page.$; the actions open the sheet first
    const acts = ['fill', 'press', 'type', 'focus', 'click', 'inputValue', 'evaluate', 'elementHandle', 'getAttribute'];
    const wrap = l => new Proxy(l, { get: (t, k) => acts.includes(k) ? async (...a) => { await prepForm(page, sel); return t[k](...a); } : ['first', 'last', 'nth'].includes(k) ? (...a) => wrap(t[k](...a)) : (typeof t[k] === 'function' ? t[k].bind(t) : t[k]) });
    return wrap(loc);
  };
  page.loading = 0;   // requests still out, for settle()
  page.urls = [];     // every address the page asked for, in order (routed answers leave no resource timing)
  page.on('request', q => { page.loading++; page.urls.push(q.url()); });
  page.on('requestfinished', () => { page.loading--; });
  page.on('requestfailed', () => { page.loading--; });
  page.on('pageerror', e => page.errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') page.errors.push('console: ' + m.text()); });
  await page.goto(base + (hash || ''), { waitUntil: 'load' });
  // the book starts up in steps (the Firebase stand-in loads, then the kitchen's settings, then the lists and the
  // sign-in), so a page that has just opened waits for the settings to be read (or to fail) and has to be still for longer
  await settle(page, o.wait || 600, 300, () => { const st = window.LK_PREP && window.LK_PREP.state; return !st || !st.pin || st.configState === 'ok' || st.configState === 'error' || st.configState === 'offline'; });
  const expectedLogin = !o.noPin && !o.noAnon && sess && exp > serverClock && !(o.deviceUnclassified || o.profile === null || o.deviceMode === 'unclassified');
  if (expectedLogin) {
    await waitFor(page, () => { const p=window.LK_PREP; return p && (p.state.configState === 'offline' || p.privateAccess() && (p.functionOnly() || p.state.configFull)); }, null, 5000).catch(() => {});
    await settle(page, 800, 200);
  }
  return page;
}
/* Sideways scroll: false when the page fits, otherwise a short note saying by how much, the scrollbar width and the
   first elements that stick out, so a failure on another machine (the GitHub runner) can be read from the log. */
async function overflow(page) {
  return page.evaluate(() => {
    const d = document.documentElement, over = d.scrollWidth - window.innerWidth;
    if (over <= 1) return false;
    const wide = [];
    document.querySelectorAll('body *').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > window.innerWidth + 1 && wide.length < 4) wide.push(el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : '') + ' to ' + Math.round(r.right));
    });
    return over + ' px over (window ' + window.innerWidth + ', scrollbar ' + (window.innerWidth - d.clientWidth) + '): ' + wide.join(', ');
  });
}
function check(cond, msg, results) { results.push((cond ? 'PASS ' : 'FAIL ') + msg); }
/* The helpers every test file uses: results() gives the list and its ok(); txt reads an element's trimmed text
   (null when it is not on the page), tap clicks one from inside the page, row reads a prep line by its item id. */
function results() { const R = []; return { R, ok: (c, m) => check(c, m, R) }; }
const txt = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.trim() : null; }, sel);
const tap = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, sel);
const row = (page, id) => page.evaluate(i => { const e = document.getElementById('nbr-' + i); return e ? e.textContent : null; }, id);
/* The chef mark's menu in the top bar (20 Oct 2026): chefItems lists what it offers (the links by their page, the
   buttons by name: section, pings, staff, and out for Sign out) and closes it again; chef taps one of the Chef group. */
async function chefItems(page) {
  await page.evaluate(() => { const g = document.querySelector('.nt-got'); if (g) g.click(); });   // today's pings popup first
  await page.click('.wtop-who'); await settle(page, 150);
  const l = await page.evaluate(() => [...document.querySelectorAll('.wm .wm-a')].map(e => e.getAttribute('data-v') || (e.getAttribute('data-who') === 'out' ? 'out' : (e.getAttribute('href') || '').replace('#/', ''))));
  await page.keyboard.press('Escape'); await settle(page, 100);
  // Sign out sits on the person card at the top since 3 Nov 2026; the list keeps it last, as the menu had it before
  return l.filter(x => x !== 'out').concat(l.includes('out') ? ['out'] : []);
}
/* Admin in the chef mark's menu (21 Oct 2026): 'signed' (Google sign-in done), 'outline' (Head chef PIN only) or 'none'. */
async function admItem(page) {
  await page.evaluate(() => { const g = document.querySelector('.nt-got'); if (g) g.click(); });
  await page.click('.wtop-who'); await settle(page, 150);
  const s = await page.evaluate(() => { const a = document.querySelector('.wm .wm-adm'); return a ? (a.classList.contains('is-signed') ? 'signed' : 'outline') : 'none'; });
  await page.keyboard.press('Escape'); await settle(page, 100);
  return s;
}
/* Settings rows open in place (3 Nov 2026, docs/settings-options/brief.md): opens the row with this id if it is folded,
   so its control can be tapped. The controls are on the page while folded, just hidden. */
async function setRow(page, id) {
  const b = page.locator('[data-act="strow"][data-val="' + id + '"]');
  await b.waitFor({ timeout: 8000 });
  if (await b.getAttribute('aria-expanded') !== 'true') { await b.click(); await settle(page, 100); }
}
async function chef(page, v) {
  await page.evaluate(() => { const g = document.querySelector('.nt-got'); if (g) g.click(); });
  await page.click('.wtop-who'); await settle(page, 150);
  await page.click('.wm [data-who="open"][data-v="' + v + '"]'); await settle(page, 400);
}
/* Who is signed in on this phone (3 Nov 2026: the "Writing as" row went from the four work pages; the chef hat says it). */
const whoIs = page => page.evaluate(() => (window.LK_PREP && window.LK_PREP.whoName && window.LK_PREP.whoName()) || '');
/* "Not you?" since 3 Nov 2026: the person card's Sign out in the chef hat menu. Opens the menu if it is closed and taps
   it once. Returns the line under it: '' once signed out, "Not saved yet. Tap again to sign out" (or "Not sent yet.")
   when the first tap only asks. */
async function notYou(page) {
  await page.evaluate(() => { const g = document.querySelector('.nt-got'); if (g) g.click(); });
  if (!(await page.$('.wm'))) { await page.click('.wtop-who'); await settle(page, 150); }
  await page.click('.wm [data-who="out"]'); await settle(page, 300);
  return page.evaluate(() => { const s = document.querySelector('.wm-out small'); return s ? s.textContent.trim() : ''; });
}
/* Prints the results and sets the exit code, so run.js knows whether the file passed. */
function report(results) {
  const failed = results.filter(x => x.startsWith('FAIL'));
  console.log(results.join('\n'));
  console.log(failed.length + ' failed of ' + results.length);
  process.exitCode = failed.length ? 1 : 0;
}
/* Waits until fn (run in the page) returns something truthy. page.waitForFunction runs its check through eval, which the
   book's security header (20 Oct 2026) blocks, so this asks with page.evaluate every 50 ms instead. */
async function waitFor(page, fn, arg, timeout) {
  const end = Date.now() + (timeout || 5000);
  for (;;) {
    if (await page.evaluate(fn, arg)) return true;
    if (Date.now() > end) throw new Error('waitFor: timed out');
    await sleep(50);
  }
}
/* Opens an admin page by its id (people, notes, tools...): the page buttons sit under five groups (20 Oct 2026), so
   this taps each group until the page is open or its button shows, then taps that. */
async function adminTab(page, t) {
  await page.evaluate(t => {
    const st = () => (window.LK_PREP && window.LK_PREP.state) || {};
    const leaf = () => document.querySelector('[data-p="a-tab"][data-t="' + t + '"]');
    if (leaf()) { leaf().click(); return; }
    for (const g of [...document.querySelectorAll('[data-p="a-group"]')].map(x => x.getAttribute('data-g'))) {
      document.querySelector('[data-p="a-group"][data-g="' + g + '"]').click();
      if (st().atab === t) return;
      if (leaf()) { leaf().click(); return; }
    }
  }, t);
  await settle(page, 250);
}
/* Opens a row of the admin Kitchen Overview in place: secs (Kitchen sections), see (Pages staff see) or badges (Weekly
   top tickers), on Team, People until 5 Nov 2026. A row already open stays open. */
async function kitchenRow(page, r, ms) {
  await adminTab(page, 'kitchen-home');
  const state = await page.evaluate(r => { const b = document.querySelector('[data-p="k-row"][data-r="' + r + '"]'); return b ? b.getAttribute('aria-expanded') : null; }, r);
  if (state === null) throw new Error('kitchenRow: no Kitchen row ' + r);
  if (state !== 'true') await page.click('[data-p="k-row"][data-r="' + r + '"]');
  await settle(page, ms || 300);
}
/* Remove (or Put back) a prep or order line the way the page offers it: on a phone through the line's ⋯ menu (22 Oct
   2026, Option B), on a laptop with the button in the line. sel is the line's own button, e.g. '[data-p="del"][data-id="i2"]'. */
async function lineAct(page, sel) {
  const more = await page.evaluate(s => { const b = document.querySelector(s), r = b && b.closest('.nb-row'), m = r && r.querySelector('.nb-more'); return !!(m && m.getClientRects().length); }, sel);
  if (!more) return page.click(sel);
  await page.evaluate(s => document.querySelector(s).closest('.nb-row').querySelector('.nb-more').click(), sel);
  await settle(page, 120);
  return page.click('#lm-sheet .lm-act');
}
/* Select an existing choice through its adaptive trigger. Keeping the source selector here makes
   older journey tests describe the same intent while exercising the new visible control. */
async function choose(page, selector, options) {
  const target = page.locator(selector).first();
  const trigger = target.locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " ux-choice-source ")][1]/following-sibling::*[1][contains(concat(" ", normalize-space(@class), " "), " ux-picker-trigger ")]');
  const visible = page.locator(':visible');
  // Enhancement can hide the source during a redraw. Resolve its visible control at the actual click.
  await target.and(visible).or(trigger.and(visible)).first().click(options);
  if (!await page.locator('.ux-picker').count()) return;
  const source = await target.evaluateAll(nodes => {
    const el = nodes[0];
    if (!el) return null;
    const group = el.closest('.ux-choice-source');
    if (!group || !group.nextElementSibling || getComputedStyle(group).display !== 'none') return null;
    const buttons = [...group.querySelectorAll('button')];
    return { trigger: group.nextElementSibling.classList.contains('ux-picker-trigger'), index: el.matches('[data-mg="tag"]') ? (el.classList.contains('is-has') ? 2 : el.classList.contains('is-may') ? 0 : 1) : el.matches('[data-p="mn-attc"]') ? ({ present: 1, apology: 2, absent: 0 }[el.dataset.st] || 0) : buttons.indexOf(el), multiple: /:(free|n-dow|cut-day)$/.test([...el.attributes].filter(a => /^data-(act|p)$/.test(a.name)).map(a => ':' + a.value).join('')) };
  }).catch(() => null);
  if (!source || !source.trigger || source.index < 0) return;
  await page.locator('.ux-picker [data-index="' + source.index + '"]').click();
  if (source.multiple) await page.locator('.ux-picker-footer .dark').click();
  await settle(page, 250); // Let the overlay's Back entry and scroll restoration finish.
}
async function pick(page, selector, value) {
  const source = page.locator(selector).first();
  await source.evaluate(el => el.nextElementSibling.click());
  const option = await source.evaluate((el, value) => {
    const v = typeof value === 'object' ? value.value : value;
    return [...el.options].findIndex(o => typeof value === 'object' && value.label ? o.label === value.label : o.value === v);
  }, value);
  const search = page.locator('.ux-picker-head input');
  if (await search.count()) {
    const label = await source.evaluate((el, i) => el.options[i].textContent, option);
    await search.fill(label); await search.press('Enter');
    await page.locator('.ux-picker-option').filter({ hasText: label }).first().click();
  } else await page.locator('.ux-picker [data-index="' + option + '"]').click();
  await settle(page, 250);
}

// the prep list's and the order list's add forms are in Add a line sheets (3 Nov 2026, work pages redesign A)
const PREP_FORM = /#p-(text|qty|section)\b|data-k="p-(text|qty|section)"|data-p="(recipe-toggle|quick)"|\.nb-qadd\b|#o-(text|qty)\b|data-k="o-(text|qty)"|data-p="oreg"/;
async function prepForm(page, sel) {
  const order = /o-(text|qty)|oreg/.test(sel || ''), open = order ? '[data-p="o-write"]' : '[data-p="write"]', box = order ? '.o-sheet #o-text' : '.p-sheet #p-text';
  if (await page.$(box) || !(await page.$(open))) return;
  // something the selector names already on screen (Handy's Quick add on a laptop): no sheet needed
  if (sel && await page.evaluate(s => { try { return [...document.querySelectorAll(s)].some(e => e.getClientRects().length); } catch (e) { return false; } }, sel)) return;
  if (order) await oLog(page); else await pLog(page);
}
async function prepAway(page, sel) {
  const shut = await page.evaluate(s => {
    const sh = document.querySelector('.p-sheet, .o-sheet'); if (!sh) return false;
    let el = null; try { el = document.querySelector(s); } catch (e) { return false; }
    // not when the target is in the sheet, a toast, or a picker or sheet opened over it
    if (!el || sh.contains(el) || el.closest('.sheet-bg, .p-toast, dialog, .sheet, [role="dialog"]')) return false;
    const c = sh.querySelector('[data-p="p-log-close"], [data-p="o-log-close"]'); if (c) c.click(); return !!c;
  }, sel).catch(() => false);
  if (shut) await settle(page, 100);
}
async function clear(page, selector) {
  if (PREP_FORM.test(selector)) await prepForm(page, selector);
  const input = page.locator(selector).first();
  if (await input.getAttribute('data-smart-search')) {
    const button = input.locator('..').locator('.ux-search-clear');
    if (await button.isVisible()) await button.click();
  } else await input.fill('');
}
// Wastage (3 Nov 2026, work pages redesign A): the form is in the Log waste sheet, and the end-of-day review in its own.
// These open the sheet when it is not open already, and wait for its first box.
async function wLog(page) {
  if (await page.$('.w-sheet #w-text')) return;
  // a click in the page, like fill(), so a sheet that came up by itself (the pings) does not stop the test
  await page.evaluate(() => document.querySelector('[data-p="w-log"]').click());
  await waitFor(page, () => !!document.querySelector('.w-sheet #w-text'), null, 4000);
}
async function wReview(page) {
  if (await page.$('.w-sheet #w-ra')) return;
  await page.evaluate(() => document.querySelector('[data-p="w-rv"]').click());
  await waitFor(page, () => !!document.querySelector('.w-sheet #w-ra'), null, 4000);
}
// Transfers (3 Nov 2026, work pages redesign A): the form is in the Log a transfer sheet
async function xLog(page) {
  if (await page.$('.tr-sheet #tr-text')) return;
  await page.evaluate(() => document.querySelector('[data-p="tr-log"]').click());
  await waitFor(page, () => !!document.querySelector('.tr-sheet #tr-text'), null, 4000);
}
/* The recipe form's ingredient row k, opened (3 Nov 2026): its note, recipe link, allergens, Move and Remove sit behind
   the row's arrow. Does nothing when the row is already open. */
async function openRow(page, k) {
  const sel = '[data-mg="ing-open"][data-i="' + k + '"]';
  await reveal(page, sel);
  if (await page.getAttribute(sel, 'aria-expanded') !== 'true') { await page.click(sel); await settle(page, 150); }
}
/* The recipe form's chapters (3 Nov 2026): opens the chapter, and More card details, that holds the box or button sel,
   so a test can type in it or tap it. Does nothing when it is already on screen or not on the page. */
async function reveal(page, sel) {
  const where = () => page.evaluate(s => { const el = document.querySelector(s); if (!el) return null; const ch = el.closest('[data-ch]'); return { ch: ch && ch.hidden ? ch.getAttribute('data-ch') : '', more: !!el.closest('.mg-more-box[hidden]') }; }, sel);
  let w = await where(); if (!w) return;
  if (w.ch) { await page.click('[data-mg="ch"][data-v="' + w.ch + '"]'); await settle(page, 150); w = await where() || {}; }
  if (w.more) { await page.click('[data-mg="more-card"]'); await settle(page, 150); }
}
// opens a chapter of the recipe form by its key: ing, method, alg, draw, card, hist
async function chapter(page, k) {
  if (await page.getAttribute('[data-mg="ch"][data-v="' + k + '"]', 'aria-current') !== 'true') { await page.click('[data-mg="ch"][data-v="' + k + '"]'); await settle(page, 150); }
}
// Prep (3 Nov 2026, work pages redesign A): the add form is in the Add a line sheet. Opens it when it is not open.
async function pLog(page) {
  if (await page.$('.p-sheet #p-text')) return;
  await page.evaluate(() => document.querySelector('[data-p="write"]').click());
  await waitFor(page, () => !!document.querySelector('.p-sheet #p-text'), null, 4000);
}
async function oLog(page) {
  if (await page.$('.o-sheet #o-text')) return;
  await page.evaluate(() => document.querySelector('[data-p="o-write"]').click());
  await waitFor(page, () => !!document.querySelector('.o-sheet #o-text'), null, 4000);
}
/* The drawing studio (3 Nov 2026): the tools not used on every drawing are under More, and a picked part's arranging,
   copying and changing under its own More. Opens the one that holds sel, so a test can tap it. */
async function dwShow(page, sel) {
  if (await page.$(sel)) return;   // on the page already (a chip the shared picker stands in for counts too)
  const part = /data-dw="(dup|front|fwd|bwd|back|flip|stretch|split|piece|swap)"|data-v="edit"/.test(sel);
  const opener = part ? '[data-dw="panel"][data-v="pmore"]' : '[data-dw="panel"][data-v="more"]';
  // the quiet canvas (4 Nov 2026): a picked part's bar has its own More, so the part is let go to reach More tools
  if (!part && !(await page.$(opener)) && await page.$('.dw-ctx [data-dw="none"]')) { await page.click('.dw-ctx [data-dw="none"]'); await settle(page, 150); }
  if (await page.$(opener) && await page.getAttribute(opener, 'aria-pressed') !== 'true' && await page.getAttribute(opener, 'aria-expanded') !== 'true') { await page.click(opener); await settle(page, 150); }
}
// The page's add button (work pages redesign A, as drawn in the agreed options page): on a phone, full width and docked
// right above the tab bar; on wider screens, in the page header
const docked = (page, sel) => page.evaluate(s => {
  const b = document.querySelector(s); if (!b) return false;
  const r = b.getBoundingClientRect(), t = document.querySelector('.tabbar');
  if (t && t.getClientRects().length) { const tab = t.getBoundingClientRect(); return r.bottom <= tab.top + 1 && tab.top - r.bottom <= 16 && r.width >= innerWidth - 40; }
  return !!b.closest('.nb-ph');
}, sel);
// the studio's Add food panel (4 Nov 2026, the quiet canvas): nothing opens by itself, and a picked part's bar has no
// Add food, so the part is let go first
async function dwAdd(page) {
  await waitFor(page, () => !!document.querySelector('.dw-ctx'), null, 15000);
  if (!(await page.$('#dw-q'))) {
    if (await page.$('.dw-ctx [data-dw="none"]')) { await page.click('.dw-ctx [data-dw="none"]'); await settle(page, 150); }
    await page.click('.dw-ctx [data-dw="panel"][data-v="lib"]');
  }
  await waitFor(page, () => !!document.getElementById('dw-q'), null, 15000);
}
/* Updates are silent (13 Nov 2026, docs/site-publishing.md): no band offers a new version found by itself; the book
   updates when it is safe. updateNow() is the update someone asks for (Update now in Settings, a Reload button, all
   LK_UPDATE.now()): it waits until the book knows of a new version, then asks for it, and the band shows what it does
   (Checking the signal..., Updating..., Not sent yet..., No signal...). ms: how long to wait for the new version. */
async function updateNow(page, ms) {
  await waitFor(page, () => !!(window.LK_UPDATE && window.LK_UPDATE.state() === 'ready'), null, ms || 8000);
  await page.evaluate(() => window.LK_UPDATE.now());
  await waitFor(page, () => !!document.querySelector('.upd-bar.is-on'), null, 3000).catch(() => {});
}
module.exports = { updateNow, docked, oLog, pLog, whoIs, notYou, wLog, wReview, xLog, openRow, reveal, chapter, dwShow, dwAdd, clear, choose, pick, lineAct, wasteSum, chromeOpts, chromium, settle, sleep, waitFor, chefItems, admItem, chef, setRow, adminTab, kitchenRow, start, open, overflow, check, report, results, txt, tap, row, seed, guides, mail, sha, ymd, PIN, NOW, BASE, PNG };
