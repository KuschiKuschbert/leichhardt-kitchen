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
const crypto = require('crypto'), fs = require('fs'), path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8777/';
const FAKE = path.join(__dirname, 'fake');
const PDFJS = path.join(__dirname, 'node_modules', 'pdfjs-dist') + path.sep;
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const PIN = '000000';   // the stand-in kitchen PIN: 6 digits, so it can never be the real one (always 4)
const K = ['kitchens', PIN];
const NOW = (function () { const d = new Date(); d.setHours(14, 0, 0, 0); return d.getTime(); })();
function ymd(d) { const p = n => (n < 10 ? '0' : '') + n; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }

/* Three made-up people: Sam (sous chef, PIN 1111), Ann and Bo (staff, 2222 and 3333), today's prep lines in three
   sections, two order lines and one wastage entry. "extra" adds or replaces documents (undefined removes one). */
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
  const items = [
    ['i1', 'Slice onions', 'Larder', '2 tubs', {}], ['i2', 'Pick coriander', 'Larder', '', {}], ['i3', 'Portion rump', 'Grill', '20', { urgent: true }],
    ['i4', 'Make gravy', 'Sauce', '5 L', { rolled: 1 }], ['i5', 'Laksa', 'Sauce', '1 batch', {}], ['i6', 'Wash bok choy', 'Larder', '', {}]
  ];
  items.forEach(([id, text, station, qty, x], k) => put(['days', today, 'items', id], Object.assign({ text, station, qty, recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: NOW - (60 - k) * 60000, done: false, deleted: false }, x)));
  put(['orders', today, 'lines', 'o1'], { text: 'Milk', qty: '6 L', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: NOW - 3600000, ordered: false, deleted: false });
  put(['orders', today, 'lines', 'o2'], { text: 'Brioche buns', qty: '4 packs', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: NOW - 3000000, ordered: false, deleted: false });
  put(['waste', today, 'lines', 'w1'], { text: 'Chips', amount: 2, unit: 'kg', reason: 'excess', action: '', station: 'Fryer', addedBy: 'Bo', addedById: 'bo', addedAt: NOW - 1800000, deleted: false });
  return Object.assign(s, extra || {});
}

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

/* Installed Google Chrome by default. CHROME=/path/to/chrome uses another Chromium (for example on a server). */
async function start() {
  return chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, headless: true } : { channel: 'chrome', headless: true });
}

/* Opens one page in a fresh browser profile.
   o.width, o.height  viewport (390 x 844 by default, a phone)
   o.who              who is signed in on this phone: 'sam' (default), 'ann', 'bo', or '' for the name screen
   o.noTok            the person is picked but has to type their own PIN
   o.noPin            no kitchen PIN on this phone yet
   o.admin            the head chef's Google account is signed in
   o.settings         saved recipe book settings, for example { view: 'tiles' }
   o.extra            more seed documents (see seed)
   o.touch            a touch screen
   o.clock            the phone's clock when the page opens (NOW by default)
   o.tz               the phone's time zone (kitchen time by default)
   o.server           the server's time when the page opens; without it the update check's answer has no Date,
                      so the book keeps the phone's clock (LK_TIME in index.html)
   o.fakeServer       documents the "server" holds newer copies of than the phone (path: data), for getDocFromServer
   o.fakeMode         the stand-in's mode from the first request: 'fail' (every read and write fails, like no signal) or 'deny' */
async function open(browser, hash, o) {
  o = o || {};
  const w = o.width || 390, h = o.height || 844;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block', hasTouch: !!o.touch, deviceScaleFactor: 1, timezoneId: o.tz || 'Australia/Brisbane' });
  await ctx.clock.install({ time: o.clock || NOW });
  const opened = Date.now();
  await ctx.route(u => u.href === BASE + 'index.html', async r => {
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
  const who = o.who === undefined ? 'sam' : o.who, pins = { sam: '1111', ann: '2222', bo: '3333' };
  const ls = {
    'fake.fs': JSON.stringify(seed(o.extra)),
    'lk.prep.pin': o.noPin ? '' : PIN,
    'lk.prep.who': who || '',
    'lk.prep.tok': who && !o.noTok ? who + ':' + sha('lk:' + who + ':' + pins[who]) : '',
    'lk.prep.seen': String(o.clock || NOW),   // on the phone's clock, like the idle check
    'lk.settings.v1': JSON.stringify(Object.assign({ installNo: true }, o.settings || {}))
  };
  if (o.admin) ls['fake.user'] = '1';
  if (o.fakeServer || o.fakeMode) await ctx.addInitScript(f => { window.__fake = { mode: f.mode || 'ok', writes: [], reads: [], server: f.server }; }, { mode: o.fakeMode, server: o.fakeServer });
  // seed once per tab, so a reload keeps whatever the test did
  await ctx.addInitScript(ls => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.clear();
    Object.keys(ls).forEach(k => { if (ls[k]) localStorage.setItem(k, ls[k]); });
  }, ls);
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') page.errors.push('console: ' + m.text()); });
  await page.goto(BASE + (hash || ''), { waitUntil: 'load' });
  await page.waitForTimeout(o.wait || 600);
  return page;
}
async function overflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
}
function check(cond, msg, results) { results.push((cond ? 'PASS ' : 'FAIL ') + msg); }
/* The helpers every test file uses: results() gives the list and its ok(); txt reads an element's trimmed text
   (null when it is not on the page), tap clicks one from inside the page, row reads a prep line by its item id. */
function results() { const R = []; return { R, ok: (c, m) => check(c, m, R) }; }
const txt = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.trim() : null; }, sel);
const tap = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, sel);
const row = (page, id) => page.evaluate(i => { const e = document.getElementById('nbr-' + i); return e ? e.textContent : null; }, id);
/* Prints the results and sets the exit code, so run.js knows whether the file passed. */
function report(results) {
  const failed = results.filter(x => x.startsWith('FAIL'));
  console.log(results.join('\n'));
  console.log(failed.length + ' failed of ' + results.length);
  process.exitCode = failed.length ? 1 : 0;
}
module.exports = { start, open, overflow, check, report, results, txt, tap, row, seed, guides, sha, ymd, PIN, NOW, BASE, PNG };
