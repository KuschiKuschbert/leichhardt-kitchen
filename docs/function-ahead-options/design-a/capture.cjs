/* Design A preview capture (functions ahead of time council, round 2, 10 Nov 2026). Preview measurements only.
   Serves the repo root on 127.0.0.1:8791, opens each preview page in Chromium at deviceScaleFactor 1, waits for the
   fonts, saves screenshots to shots/ and writes measurements.json. The same measures run on the baseline snapshots
   (../baseline/*.html) so before and after use one method.
   Run: cd docs/function-ahead-options/design-a && node build.cjs && node capture.cjs */
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '../../..'), here = __dirname, shots = path.join(here, 'shots');
const { chromium } = require(path.join(root, 'tests/node_modules/playwright-core'));
const EXE = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const PORT = 8791, ORIGIN = 'http://127.0.0.1:' + PORT + '/';
const DIR = 'docs/function-ahead-options/design-a/', BASE = 'docs/function-ahead-options/baseline/';
fs.mkdirSync(shots, { recursive: true });

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(p, (err, buf) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(buf);
  });
});

async function open(ctx, url) {
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(ORIGIN + url, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(150);
  p.errs = errs;
  return p;
}
const overflow = p => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

// Home: where the first visible "Smith 60th" starts, against the fixed tab bar's top
function homeMeasure() {
  // the tab bar is fixed at the bottom on a phone; from 720 px the page tabs are in the top bar and the screen ends at the window
  const tab = document.querySelector('.tabbar'), tabOn = tab && getComputedStyle(tab).display !== 'none' && tab.getBoundingClientRect().height > 0;
  const tabTop = tabOn ? Math.round(tab.getBoundingClientRect().top) : innerHeight;
  const vis = el => { for (let e = el; e && e !== document.body; e = e.parentElement) { if (e.hidden || getComputedStyle(e).display === 'none') return false; if (e.tagName === 'DETAILS' && !e.open && e.firstElementChild && !e.firstElementChild.contains(el)) return false; } return true; };
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let first = null, n;
  while ((n = w.nextNode())) {
    const i = n.nodeValue.indexOf('Smith 60th');
    if (i < 0 || !vis(n.parentElement)) continue;
    const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 10);
    const b = r.getBoundingClientRect();
    if (b.width && (!first || b.top < first.top)) first = { top: b.top + scrollY, bottom: b.bottom + scrollY, inside: n.parentElement.closest('section, .fn-band, div[id]')?.className || '' };
  }
  const box = s => { const e = document.querySelector(s); if (!e || e.hidden) return null; const b = e.getBoundingClientRect(); return { top: Math.round(b.top + scrollY), bottom: Math.round(b.bottom + scrollY), height: Math.round(b.height) }; };
  const rows = [...document.querySelectorAll('#hm-with-body .hm-rota tbody tr')];
  return {
    tabBarTop: tabTop,
    smithTop: first && Math.round(first.top), smithBottom: first && Math.round(first.bottom), smithIn: first && first.inside,
    smithOnFirstScreen: !!first && first.bottom <= tabTop,
    yourDay: box('#hm-day'), nextLine: box('.fa-hm-next'), onWithYou: box('#hm-with'), comingUp: box('.hm-up'),
    coworkerRowsOnFirstScreen: rows.filter(r => r.getBoundingClientRect().bottom <= tabTop).length + ' of ' + rows.length,
    pageHeight: document.documentElement.scrollHeight
  };
}
// Prep and Orders: what sits above the list, and the rows fully visible above the Add button
function listMeasure() {
  const band = document.querySelector('#fn-band'), cut = document.querySelector('#cut-band');
  const h = e => e && !e.hidden && getComputedStyle(e).display !== 'none' ? Math.round(e.getBoundingClientRect().height) : 0;
  const dock = document.querySelector('.wk-dock'), tab = document.querySelector('.tabbar');
  const dockFixed = dock && getComputedStyle(dock).position === 'fixed';
  const addTop = Math.round(Math.min(dockFixed ? dock.getBoundingClientRect().top : innerHeight, tab ? tab.getBoundingClientRect().top : innerHeight));
  const rows = [...document.querySelectorAll('#prep-root .nb-left .nb-row, #prep-root .o-page .nb-row')].filter(r => r.getBoundingClientRect().height);
  const full = rows.filter(r => r.getBoundingClientRect().top >= 0 && r.getBoundingClientRect().bottom <= addTop);
  const firstRow = rows[0] ? Math.round(rows[0].getBoundingClientRect().top + scrollY) : null;
  return { addedAboveList: h(band), bandHeight: h(band), cutBarHeight: h(cut), firstRowTop: firstRow, addTop, rowsFullyVisible: full.length, rowsTotal: rows.length,
    visibleRowNames: full.map(r => (r.querySelector('.nb-t') || r).textContent.trim().split(/\s{2,}|\n/)[0].slice(0, 30)) };
}
// what of the function a person can see on the screen now (inside an open sheet, the sheet's own box)
function factsVisible(id) {
  const pop = id ? document.getElementById('fa-sheet-' + id) : null;
  const scope = pop && pop.classList.contains('fn-pop') ? pop.querySelector('.fn-sheet') : document.body;
  const tab = document.querySelector('.tabbar'), tabOn = tab && getComputedStyle(tab).display !== 'none' && tab.getBoundingClientRect().height > 0;
  const lim = scope === document.body ? { top: 0, bottom: tabOn ? tab.getBoundingClientRect().top : innerHeight } : scope.getBoundingClientRect();
  const seen = re => { const w = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const m = re.exec(n.nodeValue); if (!m) continue; const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length); const b = r.getBoundingClientRect(); if (b.width && b.top >= lim.top && b.bottom <= lim.bottom) return true; } return false; };
  return { time: seen(/18:30/), guests: seen(/60 guests/), platters: seen(/Antipasto/), dietaries: seen(/4 gluten free/) };
}

// contrast of the line's words on its own background, as rendered (WCAG relative luminance)
function contrast() {
  const rgb = c => (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  const lum = c => { const v = rgb(c).map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return Math.round((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) * 100) / 100; };
  const bgOf = e => { for (; e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) return b; } return 'rgb(255, 255, 255)'; };
  const out = {};
  [['label "Next function"', '.fa-next-k'], ['date', '.fa-next-d'], ['guests words', '.fa-next-t'], ['function name', '.fa-next-n'], ['+1 more', '.fa-next-more'], ['minus', '.fa-next .fn-fold'], ['no signal words', '.fn-band.fa-quiet .fn-stale'], ['Cancelled tag', '.fa-next .fn-t-off']].forEach(([k, s]) => {
    const e = document.querySelector(s); if (!e) return;
    const cs = getComputedStyle(e); out[k] = { fg: cs.color, bg: bgOf(e), ratio: ratio(cs.color, bgOf(e)), sizePx: parseFloat(cs.fontSize), weight: cs.fontWeight };
  });
  const band = document.querySelector('#fn-band.fa-quiet, .fa-hm-next');
  if (band) { const b = getComputedStyle(band).backgroundColor, page = bgOf(band.parentElement); out['strip against page'] = { strip: b, page, ratio: ratio(b, page), edge: getComputedStyle(band).borderBottomColor + ' ' + getComputedStyle(band).borderBottomWidth, edgeRatio: ratio(getComputedStyle(band).borderBottomColor, page) }; }
  return out;
}
(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ executablePath: EXE });
  const M = { source: 'Preview, design A, static pages built from the implemented-app snapshots at main 184174e (../baseline), synthetic data, bundled Barlow fonts, Chromium headless shell 1243, deviceScaleFactor 1, ' + new Date().toISOString().slice(0, 10), pages: {}, baseline: {}, overflow: {}, taps: {}, jsErrors: [] };
  const ctxFor = (w, h) => browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const shot = async (p, name, full) => { await p.screenshot({ path: path.join(shots, name + '.png'), fullPage: !!full }); };

  // 1. the deliverable pages, viewport and full page
  const pages = [['home', 390, 844], ['prep', 390, 844], ['orders', 390, 844], ['home-head-1280', 1280, 900], ['home', 768, 1024], ['home-alt-card', 390, 844], ['home-alt-row', 390, 844], ['fn-week', 390, 844]];
  for (const [name, w, hgt] of pages) {
    const ctx = await ctxFor(w, hgt), p = await open(ctx, DIR + name + '.html');
    const tag = name + (name === 'home-head-1280' ? '' : '-' + w);
    await shot(p, tag); await shot(p, tag + '-full', true);
    const m = /^home/.test(name) ? await p.evaluate(homeMeasure) : /prep|orders/.test(name) ? await p.evaluate(listMeasure) : {};
    M.pages[tag] = Object.assign({ width: w, viewport: w + 'x' + hgt, overflow: await overflow(p) }, m);
    if (p.errs.length) M.jsErrors.push({ page: tag, errs: p.errs });
    await ctx.close();
  }
  // 2. the same measures on the baseline snapshots (before)
  for (const [name, file] of [['home-390', 'home-staff'], ['prep-390', 'prep-staff'], ['orders-390', 'orders-staff'], ['prep-day-before-390', 'prep-staff-day-before'], ['prep-on-the-day-390', 'prep-staff-on-the-day']]) {
    const ctx = await ctxFor(390, 844), p = await open(ctx, BASE + file + '.html');
    M.baseline[name] = Object.assign({ overflow: await overflow(p) }, /home/.test(name) ? await p.evaluate(homeMeasure) : await p.evaluate(listMeasure));
    await ctx.close();
  }
  { const ctx = await ctxFor(1280, 900), p = await open(ctx, BASE + 'home-head-1280.html'); M.baseline['home-head-1280'] = await p.evaluate(homeMeasure); await ctx.close(); }

  // 3. sideways scroll at every width, every page and frame
  const all = ['home', 'prep', 'orders', 'home-head-1280', 'home-alt-card', 'home-alt-row', 'fn-week', 'runup'].map(n => DIR + n + '.html')
    .concat(fs.readdirSync(path.join(here, 'frames')).filter(f => f.endsWith('.html')).map(f => DIR + 'frames/' + f));
  for (const w of [390, 768, 1280]) {
    const ctx = await ctxFor(w, w === 1280 ? 900 : w === 768 ? 1024 : 844);
    for (const u of all) { const p = await open(ctx, u); M.overflow[u.replace(DIR, '') + '@' + w] = await overflow(p); if (p.errs.length) M.jsErrors.push({ page: u + '@' + w, errs: p.errs }); await p.close(); }
    await ctx.close();
  }

  // 4. taps, exercised in the preview: open Home or Prep, tap until time, guests, platters and dietaries are on screen
  for (const start of ['home', 'prep']) {
    const ctx = await ctxFor(390, 844), p = await open(ctx, DIR + start + '.html');
    const before = await p.evaluate(factsVisible, null);
    await p.click('.fa-next-b'); await p.waitForTimeout(250);
    const sheetOpen = await p.evaluate(factsVisible, 'smith');
    await shot(p, start + '-390-sheet');
    // the sheet scrolls inside itself: how far down are the dietary notes?
    const dietScroll = await p.evaluate(() => { const s = document.querySelector('#fa-sheet-smith .fn-sheet'), h = document.getElementById('fa-diet-smith'); return Math.max(0, Math.round(h.getBoundingClientRect().bottom + 30 - s.getBoundingClientRect().bottom)); });
    await p.evaluate(() => { const s = document.querySelector('#fa-sheet-smith .fn-sheet'); s.scrollTop = s.scrollHeight; });
    await p.waitForTimeout(100);
    const sheetScrolled = await p.evaluate(factsVisible, 'smith');
    await shot(p, start + '-390-sheet-scrolled');
    await p.click('#fa-sheet-smith [data-fn="close"].fn-close');
    // the other way: +1 more opens the functions page
    await p.click('.fa-next-more'); await p.waitForLoadState('load'); await p.evaluate(() => document.fonts.ready);
    const week = await p.evaluate(factsVisible, null);
    const jones = await p.evaluate(() => { const e = [...document.querySelectorAll('.fn-card')].find(c => /Jones wedding/.test(c.textContent)); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : null; });
    M.taps[start] = { onOpen: before, afterOneTapOnTheLine: sheetOpen, sheetScrollToDietariesPx: dietScroll, afterScrollingTheSheet: sheetScrolled,
      afterOneTapOnPlusMore: week, jonesCardTopOnFunctionsPage: jones,
      summary: 'Tap the line (1 tap): time, guests and platters on screen at once' + (sheetOpen.dietaries ? ', dietaries too.' : '; dietaries ' + dietScroll + ' px further down the sheet (1 scroll).') +
        ' Or tap +1 more (1 tap): the Smith 60th card shows all four' + (week.time && week.guests && week.platters && week.dietaries ? '' : ' (not all on the first screen)') + '; Jones wedding card at ' + jones + ' px.' };
    await ctx.close();
  }
  // hide for today: the slip and Undo, exercised
  { const ctx = await ctxFor(390, 844), p = await open(ctx, DIR + 'prep.html');
    await p.click('#fn-band [data-fn="fold"]'); await p.waitForTimeout(100);
    const hid = await p.evaluate(() => ({ band: document.getElementById('fn-band').hidden, slip: !document.getElementById('fa-slip').hidden, words: document.querySelector('#fa-slip .p-toast-msg').textContent }));
    await shot(p, 'prep-390-hidden');
    const rows = await p.evaluate(listMeasure);
    await p.click('[data-fa="undo"]');
    const back = await p.evaluate(() => ({ band: !document.getElementById('fn-band').hidden, focus: document.activeElement && document.activeElement.getAttribute('data-fn') }));
    M.taps.hide = { afterHide: hid, rowsAfterHide: rows.rowsFullyVisible, afterUndo: back };
    await ctx.close(); }

  // every run-up and state frame at 390 x 844: what sits above the list (Prep) and where Smith 60th first shows (Home)
  M.frames = {};
  for (const f of fs.readdirSync(path.join(here, 'frames')).filter(x => /^(prep|home)-/.test(x)).sort()) {
    const ctx = await ctxFor(390, 844), p = await open(ctx, DIR + 'frames/' + f);
    const m = /^home/.test(f) ? await p.evaluate(homeMeasure) : await p.evaluate(listMeasure);
    M.frames[f.replace('.html', '')] = /^home/.test(f) ? { smithTop: m.smithTop, smithOnFirstScreen: m.smithOnFirstScreen, nextLine: m.nextLine && m.nextLine.height, onWithYouTop: m.onWithYou && m.onWithYou.top, coworkerRowsOnFirstScreen: m.coworkerRowsOnFirstScreen }
      : { band: m.bandHeight, cutBar: m.cutBarHeight, rowsFullyVisible: m.rowsFullyVisible, firstRowTop: m.firstRowTop };
    await ctx.close();
  }
  // contrast of the new line, rendered: Prep, Home, no signal and cancelled states
  M.contrast = {};
  for (const [k, u] of [['prep', DIR + 'prep.html'], ['home', DIR + 'home.html'], ['no signal', DIR + 'frames/prep-offline.html'], ['cancelled', DIR + 'frames/prep-cancelled.html']]) {
    const ctx = await ctxFor(390, 844), p = await open(ctx, u); M.contrast[k] = await p.evaluate(contrast); await ctx.close();
  }
  // 5. the run-up sheet, full page (iframes loaded and their fonts ready)
  { const ctx = await ctxFor(1280, 900), p = await open(ctx, DIR + 'runup.html');
    await p.waitForFunction(() => [...document.querySelectorAll('iframe')].every(f => f.contentDocument && f.contentDocument.readyState === 'complete'));
    for (const f of p.frames()) await f.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    await shot(p, 'runup-1280-full', true);
    M.pages['runup-1280'] = { overflow: await overflow(p), frames: (await p.$$('iframe')).length };
    await ctx.close(); }

  fs.writeFileSync(path.join(here, 'measurements.json'), JSON.stringify(M, null, 2) + '\n');
  console.log(JSON.stringify({ pages: M.pages, baseline: M.baseline, taps: M.taps, overflowNonZero: Object.entries(M.overflow).filter(([, v]) => v), jsErrors: M.jsErrors }, null, 1));
  await browser.close(); server.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
