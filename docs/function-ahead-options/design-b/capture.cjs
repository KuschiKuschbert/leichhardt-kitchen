/* Design B, "The run-up": builds the preview (build.cjs), serves the repo root on 127.0.0.1:8792, opens each page in
   Chromium (playwright-core from tests/node_modules) and saves screenshots to shots/ at deviceScaleFactor 1, then writes
   measurements.json. Every number here is a Preview measurement: static snapshots of the real app with the real
   css/app.css and the bundled preview fonts, synthetic data, Tuesday 10 Nov 2026 14:00 Queensland.
   Run: cd docs/function-ahead-options/design-b && node capture.cjs */
const path = require('path'), fs = require('fs'), http = require('http');
const here = __dirname, root = path.resolve(here, '..', '..', '..');
require('./build.cjs');
const { chromium } = require(path.join(root, 'tests', 'node_modules', 'playwright-core'));
const EXE = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const PORT = 8792, BASE = 'http://127.0.0.1:' + PORT + '/docs/function-ahead-options/';
const shots = path.join(here, 'shots');
fs.mkdirSync(shots, { recursive: true });
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const p = path.normalize(path.join(root, decodeURIComponent(req.url.split('?')[0])));
  if (!p.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(p, (err, buf) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(buf);
  });
});

/* in the page: where the first visible mention of Smith 60th starts, the tab bar, what the design adds above the list,
   the rows fully visible above the Add button, sideways overflow and overlaps */
function measure() {
  const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  const tab = document.querySelector('.tabbar'), tabTop = vis(tab) ? Math.round(tab.getBoundingClientRect().top) : innerHeight;
  let first = null;
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) {
    if (!/Smith 60th/.test(n.nodeValue) || !vis(n.parentElement)) continue;
    const r = document.createRange(); r.selectNodeContents(n); const b = r.getBoundingClientRect();
    if (b.width && b.height && (!first || b.top + scrollY < first)) first = Math.round(b.top + scrollY);
  }
  const rows = [...document.querySelectorAll('.nb-left .nb-row, .o-main .nb-row')].filter(vis);
  const add = document.querySelector('.nb-addline'), addTop = vis(add) ? Math.round(add.getBoundingClientRect().top) : null;
  const firstRow = rows[0] ? rows[0].getBoundingClientRect().top : Infinity;
  const added = [...document.querySelectorAll('[data-ru-added]')].filter(e => vis(e) && e.getBoundingClientRect().top < firstRow).reduce((s, e) => s + e.getBoundingClientRect().height, 0);
  const band = document.querySelector('#fn-band');
  const full = addTop == null ? null : rows.filter(r => { const b = r.getBoundingClientRect(); return b.top >= 0 && b.bottom <= addTop + 0.5; }).length;
  const strip = document.querySelector('[data-ru-strip]'), mascot = document.querySelector('.mascot');
  const hit = (a, b) => { if (!vis(a) || !vis(b)) return false; const x = a.getBoundingClientRect(), y = b.getBoundingClientRect(); return x.left < y.right && y.left < x.right && x.top < y.bottom && y.top < x.bottom; };
  const top = s => { const e = document.querySelector(s); return vis(e) ? Math.round(e.getBoundingClientRect().top + scrollY) : null; };
  const bottom = s => { const e = document.querySelector(s); return vis(e) ? Math.round(e.getBoundingClientRect().bottom + scrollY) : null; };
  // a cell whose words spill past its own box (an ellipsis is fine: it stays inside)
  const spill = [...document.querySelectorAll('.ru-d, .ru-wsum, .ru-wrow, .ru-card, .ru-tom')].filter(vis).filter(e => e.scrollWidth > e.clientWidth + 1).length;
  return {
    firstMention: first, firstScreenEnds: tabTop, onFirstScreen: first != null && first < tabTop,
    stripTop: top('[data-ru-strip]'), stripHeight: vis(strip) ? Math.round(strip.getBoundingClientRect().height) : 0,
    yourDayTop: top('#hm-day'), withBottom: bottom('#hm-with'),
    band: vis(band) ? Math.round(band.getBoundingClientRect().height) : 0, addedAboveList: Math.round(added),
    firstRowTop: rows[0] ? Math.round(firstRow) : null, addButtonTop: addTop, rowsFullyVisible: full,
    overflow: document.documentElement.scrollWidth - innerWidth, mascotOverStrip: hit(strip, mascot), spillingCells: spill,
    pageHeight: document.documentElement.scrollHeight
  };
}
// the Smith 60th details (time, guests, platters, dietaries) visible in an open part of the page
function details() {
  const box = [...document.querySelectorAll('.ru-card:not([hidden]), .ru-wlist:not([hidden]), .ru-tom:not([hidden])')].find(e => e.getBoundingClientRect().height > 0 && /Smith 60th/.test(e.textContent));
  if (!box) return { shown: false };
  const t = box.textContent, r = box.getBoundingClientRect(), tab = document.querySelector('.tabbar');
  return { shown: /18:30/.test(t) && /60 guests/.test(t) && /Antipasto/.test(t) && /gluten free/.test(t), bottom: Math.round(r.bottom + scrollY), withinFirstScreen: r.bottom <= (tab && tab.getBoundingClientRect().height ? tab.getBoundingClientRect().top : innerHeight) };
}

/* in the page: the rendered text colour against the first opaque background behind it, for the parts this design adds.
   Normal text needs 4.5:1, large text (24 px, or 18.66 px bold) 3:1. */
function contrast(sels) {
  const parse = c => {
    let m = c.match(/^rgba?\(([^)]+)\)/);
    if (m) { const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
    m = c.match(/^color\(srgb ([^)]+)\)/);
    if (m) { const p = m[1].split(/[\s\/]+/).filter(Boolean).map(Number); return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: p.length > 3 ? p[3] : 1 }; }
    return null;
  };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const bgOf = e => { for (let x = e; x; x = x.parentElement) { const c = parse(getComputedStyle(x).backgroundColor); if (c && c.a > 0.5) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
  return sels.map(([name, sel]) => {
    const e = [...document.querySelectorAll(sel)].find(x => x.getBoundingClientRect().height > 0);
    if (!e) return { name, sel, found: false };
    const cs = getComputedStyle(e), fg = parse(cs.color), bg = bgOf(e), a = lum(fg), b = lum(bg);
    const ratio = Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100, px = parseFloat(cs.fontSize), large = px >= 24 || (px >= 18.66 && +cs.fontWeight >= 700);
    return { name, ratio, need: large ? 3 : 4.5, pass: ratio >= (large ? 3 : 4.5), px: Math.round(px * 10) / 10, weight: cs.fontWeight };
  });
}
const HOME_C = [['strip label', '.ru-st'], ['strip count', '.ru-sc'], ['plain weekday', '.ru-day:not(.has-fn):not(.is-today) .ru-wd'], ['plain date', '.ru-day:not(.has-fn):not(.is-today) .ru-dn'],
  ['today disc', '.ru-day.is-today .ru-dn'], ['function day head', 'button.ru-fn[aria-expanded="false"] .ru-wd'], ['function name', 'button.ru-fn[aria-expanded="false"] .ru-n'], ['guests', 'button.ru-fn[aria-expanded="false"] .ru-g'],
  ['open day name', 'button.ru-fn[aria-expanded="true"] .ru-n'], ['open day guests', 'button.ru-fn[aria-expanded="true"] .ru-g'], ['card small line', '.ru-card:not([hidden]) .fn-c0'],
  ['card step words', '.ru-card:not([hidden]) .ru-sw small'], ['card past step', '.ru-card:not([hidden]) li.is-past .ru-sw b'], ['card To come', '.ru-card:not([hidden]) .ru-tc'], ['card dietaries', '.ru-card:not([hidden]) .ru-diet'],
  ['card Next tag', '.ru-card:not([hidden]) .ru-next'], ['milestone tag', '.ru-sh .fn-tag'], ['today function name', '.ru-day.is-today .ru-fn .ru-n'], ['today function guests', '.ru-day.is-today .ru-fn .ru-g'],
  ['cancelled day word', 'button.ru-fn.is-off .ru-g'], ['cancelled note', '.ru-off-note'], ['no signal line', '.ru-stale:not(.is-err)'], ['failed read line', '.ru-stale.is-err']];
const PREP_C = [['This week label', '.ru-wh'], ['This week names', '.ru-wnames'], ['Show cue', '.ru-wcue'], ['row date', '.ru-wdate'], ['row guests', '.ru-wg'], ['row platters', '.ru-wm'], ['row next', '.ru-wn'],
  ['Order today tag', '.ru-wnames .fn-t-order'], ['Prep ahead label', '.ru-week.is-ahead .ru-wh'], ['Prep ahead To come', '.ru-tom .ru-tc'], ['cancelled tag', '.ru-wrow .fn-t-off'], ['no signal line', '.ru-week .ru-stale']];
const ORD_C = [['Not ordered yet tag', '.nb-marks .fn-t-order'], ['For line', '.ru-ometa']];

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ executablePath: EXE });
  const out = { source: 'Preview: static snapshots of the implemented app (baseline snapshots of main 184174e, recorded in a32e341) with css/app.css, bundled preview fonts, synthetic data, Tue 10 Nov 2026 14:00 Queensland, deviceScaleFactor 1', pages: {}, baseline: {}, states: {}, taps: {} };
  async function open(url, w, h) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.goto(BASE + url, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready.then(() => 1));
    await p.waitForTimeout(150);
    p._errs = errs;
    return p;
  }
  async function shot(p, name, full) { await p.screenshot({ path: path.join(shots, name + '.png'), fullPage: !!full }); }
  async function tapsTo(p, sel) {
    let d = await p.evaluate(details);
    if (d.shown) return { taps: 0, ...d };
    await p.click(sel); await p.waitForTimeout(100);
    d = await p.evaluate(details);
    return { taps: d.shown ? 1 : null, ...d };
  }

  // Home, staff, 390 and 768
  let p = await open('design-b/home.html', 390, 844);
  out.pages['home-390'] = await p.evaluate(measure);
  await shot(p, 'home-390'); await shot(p, 'home-390-full', true);
  out.taps.homeToSmith = { from: 'Home (390)', ...(await tapsTo(p, '.ru-fn[data-ru-day="2026-11-12"]')) };
  await shot(p, 'home-390-open'); await shot(p, 'home-390-open-full', true);
  out.pages['home-390'].errors = p._errs; await p.context().close();
  p = await open('design-b/home.html', 768, 1024);
  out.pages['home-768'] = await p.evaluate(measure);
  await shot(p, 'home-768'); await shot(p, 'home-768-full', true);
  await p.click('.ru-fn[data-ru-day="2026-11-12"]'); await p.waitForTimeout(100); await shot(p, 'home-768-open');
  out.pages['home-768'].overflowOpen = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  await p.context().close();

  // Prep and Orders, staff, 390
  p = await open('design-b/prep.html', 390, 844);
  out.pages['prep-390'] = await p.evaluate(measure);
  await shot(p, 'prep-390'); await shot(p, 'prep-390-full', true);
  out.taps.prepToSmith = { from: 'Prep (390)', ...(await tapsTo(p, '.ru-wsum')) };
  out.pages['prep-390'].openAdded = (await p.evaluate(measure)).addedAboveList;
  await shot(p, 'prep-390-open'); await p.context().close();
  p = await open('design-b/orders.html', 390, 844);
  out.pages['orders-390'] = await p.evaluate(measure);
  await shot(p, 'orders-390'); await shot(p, 'orders-390-full', true); await p.context().close();

  // Home, head chef, 1280
  p = await open('design-b/home-head-1280.html', 1280, 900);
  out.pages['home-head-1280'] = await p.evaluate(measure);
  await shot(p, 'home-head-1280'); await shot(p, 'home-head-1280-full', true);
  out.taps.headToSmith = { from: 'Home, head chef (1280)', ...(await tapsTo(p, '.ru-fn[data-ru-day="2026-11-12"]')) };
  await shot(p, 'home-head-1280-open'); await p.context().close();

  // the baseline snapshots under the same conditions, for before and after
  for (const [n, w, h] of [['home-staff', 390, 844], ['prep-staff', 390, 844], ['orders-staff', 390, 844], ['prep-staff-day-before', 390, 844], ['prep-staff-on-the-day', 390, 844], ['home-head-1280', 1280, 900]]) {
    p = await open('baseline/' + n + '.html', w, h);
    out.baseline[n] = await p.evaluate(measure); await p.context().close();
  }

  // every run-up frame on its own at 390 x 844: overflow, what it adds above the list, rows visible
  for (const f of fs.readdirSync(path.join(here, 'states')).filter(x => x.endsWith('.html')).sort()) {
    const w = /head-1280/.test(f) ? 1280 : 390;
    p = await open('design-b/states/' + f, w, w === 390 ? 844 : 900);
    const m = await p.evaluate(measure);
    out.states[f.replace('.html', '')] = { firstMention: m.firstMention, onFirstScreen: m.onFirstScreen, band: m.band, addedAboveList: m.addedAboveList, rowsFullyVisible: m.rowsFullyVisible, overflow: m.overflow, spillingCells: m.spillingCells, errors: p._errs };
    await p.context().close();
  }

  // contrast of every part this design adds, in the states that show it
  out.contrast = {};
  for (const [f, sels] of [['home.html', HOME_C], ['states/x-home-open.html', HOME_C], ['states/od-home.html', HOME_C], ['states/d0-home.html', HOME_C], ['states/x-home-off.html', HOME_C], ['states/x-home-stale.html', HOME_C], ['states/x-home-err.html', HOME_C],
    ['prep.html', PREP_C], ['states/x-prep-open.html', PREP_C], ['states/od-prep.html', PREP_C], ['states/d1-prep.html', PREP_C], ['states/x-prep-off.html', PREP_C], ['states/x-prep-stale.html', PREP_C], ['orders.html', ORD_C], ['states/od-orders.html', ORD_C]]) {
    p = await open('design-b/' + f, 390, 844);
    out.contrast[f] = (await p.evaluate(contrast, sels)).filter(x => x.found !== false);
    await p.context().close();
  }
  const seen = {};
  Object.values(out.contrast).flat().forEach(x => { if (!seen[x.name] || x.ratio < seen[x.name].ratio) seen[x.name] = x; });
  out.contrastWorst = seen;

  // the run-up page: every frame, full page
  p = await open('design-b/runup.html', 1440, 900);
  for (const fr of p.frames()) { if (fr !== p.mainFrame()) await fr.evaluate(() => document.fonts.ready.then(() => 1)); }
  await p.waitForTimeout(300);
  out.pages['runup-1440'] = { overflow: await p.evaluate(() => document.documentElement.scrollWidth - innerWidth), frames: p.frames().length - 1 };
  await shot(p, 'runup-full', true); await p.context().close();

  const over = Object.entries(out.pages).concat(Object.entries(out.states)).filter(([, m]) => m.overflow || m.overflowOpen).map(([k]) => k);
  const spill = Object.entries(out.pages).concat(Object.entries(out.states)).filter(([, m]) => m.spillingCells).map(([k]) => k);
  out.checks = { overflowZeroEverywhere: !over.length, overflowPages: over, spillingCells: spill, mascotOverStrip: Object.entries(out.pages).filter(([, m]) => m.mascotOverStrip).map(([k]) => k),
    contrastFails: Object.values(out.contrastWorst).filter(x => !x.pass).map(x => x.name + ' ' + x.ratio) };
  fs.writeFileSync(path.join(here, 'measurements.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify({ pages: out.pages, taps: out.taps, checks: out.checks }, null, 1));
  await browser.close(); server.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
