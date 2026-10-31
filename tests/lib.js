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
  put(['config', 'main'], { people, sousIds: ['sam'], showBadges: true });
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
  cfg.fnOnlyIds = cfg.fnOnlyIds || (cfg.people || []).filter(p => p.active !== false && p.role === 'fnc').map(p => p.id);
  s[K.concat(['login', 'roster']).join('/')] = Object.fromEntries(['people', 'staffIds', 'sousIds', 'headId', 'fnIds', 'fnOnlyIds'].filter(k => cfg[k] !== undefined).map(k => [k, cfg[k]]));
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
  const st = window.__lkSettle = { muts: 0, timers: new Map() };
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
  // a scroll (a smooth jump to the method) is a change too, while it moves
  window.addEventListener('scroll', () => { st.muts++; }, { capture: true, passive: true });
  // busy: anything that would still change the page before the time "until" (on the page's own clock)
  st.check = until => {
    let busy = false;
    for (const due of st.timers.values()) if (due <= until) { busy = true; break; }
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
async function start() {
  return process.env.LK_WS ? chromium.connect(process.env.LK_WS) : chromium.launch(chromeOpts());
}

/* Opens one page in a fresh browser profile.
   o.width, o.height  viewport (390 x 844 by default, a phone)
   o.who              who is signed in on this phone: 'sam' (default), 'ann', 'bo', or '' for the name screen
   o.noTok            the person is picked but has to type their own PIN
   o.oldTok           the person signed in before PIN sessions (22 Oct 2026): the phone keeps their PIN proof
                      (lk.prep.tok) instead of a session, and moves to a session when it opens
   o.noAnon           the phone's Firebase sign-in fails (no signal on a first start): no uid, so no session
   o.noPin            no kitchen PIN on this phone yet
   o.admin            the head chef's Google account is signed in
   o.settings         saved recipe book settings, for example { view: 'tiles' }
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
   o.cold             a regex source: no signal for the paths that match, the way the book's memory cache answers it
                      (__fake.cold in tests/fake/firebase-firestore.js); with fakeMode 'hold' writes wait too.
                      __fake.warm() in the page brings the signal back
   o.init             a function run in the page before the book starts, on every load (after the seed), to stand in
                      for what the test browser lacks (the notification permission, a running service worker)
   o.block            a regex source: the book's own files whose address matches fail to load (say js/cutoffs.js)
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
    if (fs.existsSync(f)) return r.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(f, 'utf8') });
    return r.fulfill({ status: 200, contentType: 'text/javascript', body: 'export {}' });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, body: '' }));
  // pdf.js (the admin Guides tab reads PDFs with it) comes from the copy installed with the tests, not the internet
  await ctx.route(/^https:\/\/cdn\.jsdelivr\.net\/npm\/pdfjs-dist@[^/]+\//, r => {
    const rel = new URL(r.request().url()).pathname.replace(/^\/npm\/pdfjs-dist@[^/]+\//, ''), f = path.join(PDFJS, rel);
    if (!f.startsWith(PDFJS) || !fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
    return r.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*' }, contentType: /\.m?js$/.test(f) ? 'text/javascript' : 'application/octet-stream', body: fs.readFileSync(f) });
  });
  const who = o.who === undefined ? (o.admin ? '' : 'sam') : o.who, pins = { sam: '1111', ann: '2222', bo: '3333', fay: '5151', finn: '5252' };
  // a person signed in on this phone has a running PIN session (sessions/<this phone's uid>), as every phone does once
  // it has moved from the older proof; the head chef's Google account is the phone's sign-in when o.admin is set
  const store = seed(o.extra), uid = o.admin ? 'owner' : 'anon-test', exp = (o.clock || NOW) + 30 * 86400000;
  const pinAt = who && (store[K.concat(['pinset', who]).join('/')] || {}).at, sess = who && !o.noTok && !o.oldTok && !o.noAnon && typeof pinAt === 'number';
  if (sess) store[K.concat(['sessions', uid]).join('/')] = { by: who, pinAt, exp, at: o.clock || NOW };
  const ls = {
    // Existing journeys use a returning admin whose last page was Insights. Set adminPage: '' to test a first visit.
    'lk.prep.atab': o.adminPage === undefined ? 'insights' : o.adminPage,
    'fake.fs': JSON.stringify(store),
    'fake.anon': o.noAnon ? '' : 'anon-test',
    'lk.prep.pin': o.noPin ? '' : PIN,
    'lk.prep.who': who || '',
    'lk.prep.tok': who && o.oldTok ? who + ':' + sha('lk:' + who + ':' + pins[who]) : '',
    'lk.prep.sess': sess ? [who, exp, uid, pinAt].join(':') : '',
    'lk.prep.seen': String(o.clock || NOW),   // on the phone's clock, like the idle check
    'lk.settings.v1': JSON.stringify(Object.assign({ installNo: true }, o.settings || {}))
  };
  if (!o.board) ['sam', 'ann', 'bo', 'fay', 'finn'].concat(who ? [who] : []).forEach(id => { ls['lk.board.' + id] = ymd(new Date(o.clock || NOW)); });
  if (o.admin) ls['fake.user'] = '1';
  if (o.noAnon) await ctx.addInitScript(() => { window.__fakeNoAnon = true; });
  if (o.fakeServer || o.fakeMode || o.failReads || o.denyReads || o.cold) await ctx.addInitScript(f => { window.__fake = { mode: f.mode || 'ok', writes: [], reads: [], server: f.server, failReads: f.fail ? new RegExp(f.fail) : null, denyReads: f.deny ? new RegExp(f.deny) : null, cold: f.cold ? new RegExp(f.cold) : null }; }, { mode: o.fakeMode, server: o.fakeServer, fail: o.failReads, deny: o.denyReads, cold: o.cold });
  // seed once per tab, so a reload keeps whatever the test did
  await ctx.addInitScript(ls => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.clear();
    Object.keys(ls).forEach(k => { if (ls[k]) localStorage.setItem(k, ls[k]); });
  }, ls);
  if (o.init) await ctx.addInitScript(o.init);
  if (o.block) await ctx.route(new RegExp(o.block), r => r.abort());
  const page = await ctx.newPage();
  page.errors = [];
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
  const expectedLogin = !o.noPin && !o.noAnon && ((sess && !o.admin) || (o.admin && (!who || who === (store[K.concat(['config','main']).join('/')] || {}).headId)));
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
  return l;
}
/* Admin in the chef mark's menu (21 Oct 2026): 'signed' (Google sign-in done), 'outline' (Head chef PIN only) or 'none'. */
async function admItem(page) {
  await page.evaluate(() => { const g = document.querySelector('.nt-got'); if (g) g.click(); });
  await page.click('.wtop-who'); await settle(page, 150);
  const s = await page.evaluate(() => { const a = document.querySelector('.wm .wm-adm'); return a ? (a.classList.contains('is-signed') ? 'signed' : 'outline') : 'none'; });
  await page.keyboard.press('Escape'); await settle(page, 100);
  return s;
}
async function chef(page, v) {
  await page.evaluate(() => { const g = document.querySelector('.nt-got'); if (g) g.click(); });
  await page.click('.wtop-who'); await settle(page, 150);
  await page.click('.wm [data-who="open"][data-v="' + v + '"]'); await settle(page, 400);
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
/* Remove (or Put back) a prep or order line the way the page offers it: on a phone through the line's ⋯ menu (22 Oct
   2026, Option B), on a laptop with the button in the line. sel is the line's own button, e.g. '[data-p="del"][data-id="i2"]'. */
async function lineAct(page, sel) {
  const more = await page.evaluate(s => { const b = document.querySelector(s), r = b && b.closest('.nb-row'), m = r && r.querySelector('.nb-more'); return !!(m && m.getClientRects().length); }, sel);
  if (!more) return page.click(sel);
  await page.evaluate(s => document.querySelector(s).closest('.nb-row').querySelector('.nb-more').click(), sel);
  await settle(page, 120);
  return page.click('#lm-sheet .lm-act');
}
module.exports = { lineAct, wasteSum, chromeOpts, chromium, settle, sleep, waitFor, chefItems, admItem, chef, adminTab, start, open, overflow, check, report, results, txt, tap, row, seed, guides, mail, sha, ymd, PIN, NOW, BASE, PNG };
