/*
  Shared setup for the click tests: Chrome through playwright-core, a stand-in for Firebase, and seed data.

  The prep pages talk to Firestore. The tests never do: every request for the Firebase SDK is answered with the
  small stand-ins in tests/fake/, which keep the data in the page's localStorage. So no real kitchen PIN, staff
  names or prep lines are needed, and nothing is written to the real book, even when BASE points at the live site.

  Every page opens at 14:00 today (the clock then runs as normal), so time-of-day features such as the 10:30
  notes popup behave the same whenever the tests are run.
*/
const { chromium } = require('playwright-core');
const crypto = require('crypto'), fs = require('fs'), path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8777/';
const FAKE = path.join(__dirname, 'fake');
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
   o.touch            a touch screen */
async function open(browser, hash, o) {
  o = o || {};
  const w = o.width || 390, h = o.height || 844;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block', hasTouch: !!o.touch, deviceScaleFactor: 1 });
  await ctx.clock.install({ time: NOW });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => {
    const f = path.join(FAKE, path.basename(new URL(r.request().url()).pathname));
    if (fs.existsSync(f)) return r.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(f, 'utf8') });
    return r.fulfill({ status: 200, contentType: 'text/javascript', body: 'export {}' });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, body: '' }));
  const who = o.who === undefined ? 'sam' : o.who, pins = { sam: '1111', ann: '2222', bo: '3333' };
  const ls = {
    'fake.fs': JSON.stringify(seed(o.extra)),
    'lk.prep.pin': o.noPin ? '' : PIN,
    'lk.prep.who': who || '',
    'lk.prep.tok': who && !o.noTok ? who + ':' + sha('lk:' + who + ':' + pins[who]) : '',
    'lk.prep.seen': String(NOW),
    'lk.settings.v1': JSON.stringify(Object.assign({ installNo: true }, o.settings || {}))
  };
  if (o.admin) ls['fake.user'] = '1';
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
/* Prints the results and sets the exit code, so run.js knows whether the file passed. */
function report(results) {
  const failed = results.filter(x => x.startsWith('FAIL'));
  console.log(results.join('\n'));
  console.log(failed.length + ' failed of ' + results.length);
  process.exitCode = failed.length ? 1 : 0;
}
module.exports = { start, open, overflow, check, report, seed, sha, ymd, PIN, NOW, BASE };
