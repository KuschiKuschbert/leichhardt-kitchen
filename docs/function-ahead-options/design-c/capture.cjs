/* Design C preview: build, serve, screenshot and measure (functions ahead of time, round 2, 10 Nov 2026).
   Preview only. Serves the repo root on 127.0.0.1:8793 with Node http, opens each page in Chromium headless shell at
   deviceScaleFactor 1, waits for the fonts, saves shots/ and writes measurements.json. Every number is Preview.
   Run: cd docs/function-ahead-options/design-c && node capture.cjs */
const http = require('http'), fs = require('fs'), path = require('path');
const here = __dirname, root = path.resolve(here, '../../..');
const { chromium } = require(path.join(root, 'tests/node_modules/playwright-core'));
const EXE = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const PORT = 8793, BASE = 'http://127.0.0.1:' + PORT + '/docs/function-ahead-options/';
require('./build.cjs');
const shots = path.join(here, 'shots');
fs.mkdirSync(path.join(shots, 'states'), { recursive: true });

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  const f = path.join(root, u);
  if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => {
    if (e) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(b);
  });
});

async function open(ctx, rel) {
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(BASE + rel, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(150);
  p.errs = errs;
  return p;
}
const overflow = p => p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));

// where the first words "Smith 60th" start on the page, and the fixed tab bar's top
const firstMention = p => p.evaluate(() => {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let best = null, n;
  while ((n = w.nextNode())) {
    const i = n.nodeValue.indexOf('Smith 60th'); if (i < 0) continue;
    const el = n.parentElement; if (!el || el.closest('[hidden], script, style, .visually-hidden')) continue;
    const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 10);
    const b = r.getBoundingClientRect(); if (!b.width) continue;
    const y = Math.round(b.top + window.scrollY);
    if (best === null || y < best.y) best = { y, text: el.textContent.trim().slice(0, 60) };
  }
  const tb = document.querySelector('.tabbar'), tbOn = tb && tb.getClientRects().length && getComputedStyle(tb).display !== 'none', tbTop = tbOn ? Math.round(tb.getBoundingClientRect().top) : window.innerHeight;
  return { y: best && best.y, text: best && best.text, tabbarTop: tbTop, onFirstScreen: !!best && best.y + 20 <= tbTop };
});
// Home order: where each card sits (page px)
const homeBoxes = p => p.evaluate(() => {
  const box = s => { const e = document.querySelector(s); if (!e || e.hidden) return null; const b = e.getBoundingClientRect(); return { top: Math.round(b.top + scrollY), bottom: Math.round(b.bottom + scrollY), h: Math.round(b.height) }; };
  return { card: box('.fn-hu[data-hu-card]:not([hidden])'), yourDay: box('#hm-day'), onWithYou: box('#hm-with'), prepBySection: box('#hm-prep'), comingUp: box('.hm-up'), page: document.documentElement.scrollHeight };
});
// whether the facts are all on the first screen, inside the visible card
const factsVisible = p => p.evaluate(() => {
  const t0 = document.querySelector('.tabbar'), tb = t0 && t0.getClientRects().length ? t0.getBoundingClientRect().top : window.innerHeight;
  const c = Array.prototype.find.call(document.querySelectorAll('.fn-hu[data-hu-card]'), x => !x.hidden);
  if (!c) return null;
  const want = { time: '18:30', guests: '60 guests', platters: 'Antipasto', dietaries: 'gluten free', place: 'Function room' }, out = {};
  Object.keys(want).forEach(k => {
    const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT); let n, ok = false;
    while ((n = w.nextNode())) { const i = n.nodeValue.indexOf(want[k]); if (i < 0) continue; const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + want[k].length); const b = r.getBoundingClientRect(); if (b.width && b.bottom <= tb) ok = true; }
    out[k] = ok;
  });
  return out;
});
// work pages: what sits above the list, and the rows fully visible above the Add button
const workPage = p => p.evaluate(() => {
  const top = document.querySelector('.wtop').getBoundingClientRect().bottom;
  const band = document.querySelector('#fn-band'), cut = document.querySelector('#cut-band');
  const hb = e => e && !e.hidden ? Math.round(e.getBoundingClientRect().height) : 0;
  const added = Array.prototype.reduce.call(document.querySelectorAll('.fn-hu, .c-added'), (s, e) => s + (e.hidden ? 0 : e.getBoundingClientRect().height), 0);
  const add = document.querySelector('.nb-addline'), addTop = add.getBoundingClientRect().top;
  const rows = Array.prototype.filter.call(document.querySelectorAll('.nb-row'), r => { const b = r.getBoundingClientRect(); return b.top >= top - 1 && b.bottom <= addTop + 0.5; }).length;
  const first = document.querySelector('.nb-row');
  return { band: hb(band), cutBand: hb(cut), addedAboveList: Math.round(added), firstRowTop: first ? Math.round(first.getBoundingClientRect().top) : null, addTop: Math.round(addTop), rowsAboveAdd: rows, rowsTotal: document.querySelectorAll('.nb-row').length, bellDot: !!document.querySelector('.nbell.has-new') };
});

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ executablePath: EXE });
  const M = { source: 'Preview: static pages built from ../baseline snapshots (main 184174e), real css/app.css, bundled Barlow fonts, Chromium headless shell 1243, deviceScaleFactor 1, synthetic data (Tue 10 Nov 2026 14:00)', pages: {}, baseline: {}, taps: {}, overflow: {}, errors: {} };
  const ctxs = {
    390: await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 }),
    768: await browser.newContext({ viewport: { width: 768, height: 1024 }, deviceScaleFactor: 1 }),
    1280: await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 })
  };
  const runs = [['home.html', 390], ['home.html', 768], ['prep.html', 390], ['orders.html', 390], ['home-head-1280.html', 1280], ['home.html', 1280]];
  for (const [rel, w] of runs) {
    const p = await open(ctxs[w], 'design-c/' + rel), name = rel.replace('.html', '') + (rel.includes(String(w)) ? '' : '-' + w);
    await p.screenshot({ path: path.join(shots, name + '.png') });
    await p.screenshot({ path: path.join(shots, name + '-full.png'), fullPage: true });
    M.overflow[name] = await overflow(p);
    if (p.errs.length) M.errors[name] = p.errs;
    if (rel.startsWith('home')) M.pages[name] = { firstMention: await firstMention(p), boxes: await homeBoxes(p), factsOnFirstScreen: await factsVisible(p) };
    else M.pages[name] = await workPage(p);
    await p.close();
  }
  // the same measures on the baseline snapshots, for before and after
  for (const [rel, w, k] of [['baseline/home-staff.html', 390, 'home-390'], ['baseline/home-staff.html', 768, 'home-768'], ['baseline/prep-staff.html', 390, 'prep-390'], ['baseline/orders-staff.html', 390, 'orders-390'], ['baseline/home-head-1280.html', 1280, 'home-head-1280']]) {
    const p = await open(ctxs[w], rel);
    M.baseline[k] = rel.includes('home') ? { firstMention: await firstMention(p), boxes: await homeBoxes(p) } : await workPage(p);
    await p.close();
  }

  // taps, exercised in the preview where it can show them
  {
    const p = await open(ctxs[390], 'design-c/home.html');
    const before = await factsVisible(p);
    M.taps.homeToSmithDetails = { taps: 0, how: 'Home opens with the card: time, guests, platters, dietaries and place on the first screen', check: before };
    await p.click('#hu-smith [data-hu="got"]');
    await p.waitForTimeout(100);
    const jones = await p.evaluate(() => { const c = document.querySelector('#hu-jones'); const tb = document.querySelector('.tabbar').getBoundingClientRect().top; return !c.hidden && c.textContent.includes('90 guests') && c.querySelector('.fn-hu-facts').getBoundingClientRect().bottom <= tb; });
    M.taps.homeToJonesDetails = { taps: 1, how: 'Got it on Smith 60th shows Jones wedding (2 of 2); its name and day are already on the first card (Also this week), 0 taps', check: jones };
    await p.click('#hu-jones [data-hu="got"]');
    await p.waitForTimeout(100);
    const done = await p.evaluate(() => { const d = document.querySelector('#hu-done'); return { shown: !d.hidden, height: Math.round(d.getBoundingClientRect().height), words: d.textContent.trim() }; });
    M.taps.afterBothGotIt = done;
    await p.click('#hu-done [data-hu="undo"]');
    await p.waitForTimeout(100);
    M.taps.undoBringsBack = await p.evaluate(() => !document.querySelector('#hu-jones').hidden);
    await p.screenshot({ path: path.join(shots, 'home-390-after-undo.png') });
    await p.close();
  }
  {
    const p = await open(ctxs[390], 'design-c/prep.html');
    await p.click('.nbell');
    await p.waitForTimeout(150);
    const ok = await p.evaluate(() => { const s = document.querySelector('.c-sheet'); if (!s || s.hidden) return false; const t = s.textContent; return ['18:30', '60 guests', 'Antipasto', 'gluten free', 'Function room'].every(x => t.includes(x)); });
    M.taps.prepToSmithDetails = { taps: 1, how: 'Not yet Got it: the bell (dot) opens the sheet with the heads-up. Or the KB mark to Home, 1 tap, card on top. After Got it: as today, Home then Open functions (2 taps and a scroll)', check: ok };
    await p.screenshot({ path: path.join(shots, 'prep-390-bell-open.png') });
    M.overflow['prep-390-bell-open'] = await overflow(p);
    await p.close();
  }
  M.taps.baseline = { homeToSmithDetails: '1 tap and a scroll: Coming up starts at 955 px, then Open functions (#/fn shows the next 3 days with time, guests, platters and notes)', prepToSmithDetails: '2 taps and a scroll (KB mark to Home, Open functions)', homeToJonesDetails: '2 taps and a scroll (Open functions, Show the next 14 days)', source: 'Implemented app baseline (evidence.md) and the #/fn card in js/functions.js cardHTML()' };
  M.taps.afterGotItLater = { homeToSmithDetails: 'As baseline: 1 tap and a scroll (Coming up, Open functions). Design C does not change Coming up.', note: 'Counted from the design, not exercised' };

  // run-up and every frame
  {
    const p = await open(ctxs[1280], 'design-c/runup.html');
    await p.waitForTimeout(800);
    await p.screenshot({ path: path.join(shots, 'runup-1280-full.png'), fullPage: true });
    M.overflow['runup-1280'] = await overflow(p);
    if (p.errs.length) M.errors.runup = p.errs;
    await p.close();
  }
  const { frames } = require('./build.cjs');
  M.frames = {};
  for (const f of frames) {
    const p = await open(ctxs[390], 'design-c/states/' + f + '.html');
    await p.screenshot({ path: path.join(shots, 'states', f + '.png') });
    M.overflow['state-' + f] = await overflow(p);
    if (p.errs.length) M.errors[f] = p.errs;
    if (/home|^s-(done|got|nosignal|changed|cancelled|short|later)/.test(f)) M.frames[f] = { firstMention: await firstMention(p), boxes: await homeBoxes(p) };
    else if (/prep/.test(f)) M.frames[f] = await workPage(p);
    await p.close();
  }
  // home at 768 for each card state
  for (const f of ['d1-home-tom', 's-changed', 's-cancelled']) {
    const p = await open(ctxs[768], 'design-c/states/' + f + '.html');
    M.overflow['state-' + f + '-768'] = await overflow(p);
    await p.close();
  }
  M.maxOverflow = Math.max.apply(null, Object.values(M.overflow));
  fs.writeFileSync(path.join(here, 'measurements.json'), JSON.stringify(M, null, 2));
  console.log(JSON.stringify({ maxOverflow: M.maxOverflow, home: M.pages['home-390'], prep: M.pages['prep-390'], orders: M.pages['orders-390'], taps: M.taps, errors: M.errors }, null, 1));
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
