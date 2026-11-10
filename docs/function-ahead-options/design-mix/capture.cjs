/* Combined preview capture (functions ahead of time, round 2, 10 Nov 2026). Preview measurements only.
   Builds the pages, serves the repo root on 127.0.0.1:8794 with Node http, opens each page in Chromium headless shell at
   deviceScaleFactor 1, waits for document.fonts.ready (and for src/mix.js to lock the slot), saves shots/ and writes
   measurements.json. The same measures run on the baseline snapshots (../baseline/*.html), so before and after use one
   method. Every number is Preview.
   Run: cd docs/function-ahead-options/design-mix && node capture.cjs */
const http = require('http'), fs = require('fs'), path = require('path');
const here = __dirname, root = path.resolve(here, '../../..'), shots = path.join(here, 'shots');
const { chromium } = require(path.join(root, 'tests/node_modules/playwright-core'));
const EXE = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const PORT = 8794, ORIGIN = 'http://127.0.0.1:' + PORT + '/';
const DIR = 'docs/function-ahead-options/design-mix/', BASE = 'docs/function-ahead-options/baseline/';
const built = require('./build.cjs');
fs.mkdirSync(path.join(shots, 'states'), { recursive: true });

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0].split('#')[0]));
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
  if (url.indexOf(DIR) === 0 && !/runup/.test(url)) await p.waitForFunction(() => document.documentElement.getAttribute('data-fma-ready') === '1', null, { timeout: 5000 });
  await p.waitForTimeout(120);
  p.errs = errs;
  return p;
}
const overflow = p => p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));

/* Home: where the first visible "Smith 60th" starts, against the fixed tab bar's top (the window's bottom from 720 px) */
function homeMeasure() {
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
    if (b.width && (!first || b.top < first.top)) first = { top: b.top + scrollY, bottom: b.bottom + scrollY, inside: (n.parentElement.closest('section, .fn-band') || {}).id || '' };
  }
  const box = el => { if (!el || el.hidden || getComputedStyle(el).display === 'none') return null; const b = el.getBoundingClientRect(); return { top: Math.round(b.top + scrollY), bottom: Math.round(b.bottom + scrollY), height: Math.round(b.height) }; };
  const rows = [...document.querySelectorAll('#hm-with-body .hm-rota tbody tr')];
  const slot = [...document.querySelectorAll('.fma-slot')].filter(e => !e.hidden).map(e => Object.assign({ id: e.id }, box(e)));
  return {
    tabBarTop: tabTop,
    smithTop: first && Math.round(first.top), smithIn: first && first.inside, smithOnFirstScreen: !!first && first.bottom <= tabTop,
    yourDay: box(document.querySelector('#hm-day')), slot, onWithYou: box(document.querySelector('#hm-with')), comingUp: box(document.querySelector('.hm-up')),
    onWithYouTopOnFirstScreen: !!document.querySelector('#hm-with') && document.querySelector('#hm-with').getBoundingClientRect().top < tabTop,
    coworkerRowsOnFirstScreen: rows.filter(r => r.getBoundingClientRect().bottom <= tabTop).length + ' of ' + rows.length,
    pageHeight: document.documentElement.scrollHeight
  };
}
/* Prep and Orders: what sits above the list, and the complete rows above the Add button */
function listMeasure() {
  const band = document.querySelector('#fn-band'), cut = document.querySelector('#cut-band');
  const h = e => e && !e.hidden && getComputedStyle(e).display !== 'none' ? Math.round(e.getBoundingClientRect().height) : 0;
  const dock = document.querySelector('.wk-dock'), tab = document.querySelector('.tabbar');
  const dockFixed = dock && getComputedStyle(dock).position === 'fixed';
  const addTop = Math.round(Math.min(dockFixed ? dock.getBoundingClientRect().top : innerHeight, tab && getComputedStyle(tab).display !== 'none' ? tab.getBoundingClientRect().top : innerHeight));
  const rows = [...document.querySelectorAll('#prep-root .nb-left .nb-row, #prep-root .o-page .nb-row')].filter(r => r.getBoundingClientRect().height);
  const full = rows.filter(r => r.getBoundingClientRect().top >= 0 && r.getBoundingClientRect().bottom <= addTop);
  return { addedAboveList: h(band), cutBar: h(cut), firstRowTop: rows[0] ? Math.round(rows[0].getBoundingClientRect().top + scrollY) : null, addTop, rowsAboveAdd: full.length, rowsTotal: rows.length };
}
/* what of the function a person can see now: on Home the visible heads-up card above the tab bar; in an open sheet, the sheet's box */
function factsVisible(id) {
  const pop = id ? document.getElementById('fa-sheet-' + id) : null;
  const tab = document.querySelector('.tabbar'), tabOn = tab && getComputedStyle(tab).display !== 'none' && tab.getBoundingClientRect().height > 0;
  let scope, lim;
  if (pop && pop.classList.contains('fn-pop')) { scope = pop.querySelector('.fn-sheet'); lim = scope.getBoundingClientRect(); }
  else { scope = [...document.querySelectorAll('.fn-hu')].find(c => !c.hidden) || document.body; lim = { top: 0, bottom: tabOn ? tab.getBoundingClientRect().top : innerHeight }; }
  const seen = re => { const w = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const m = re.exec(n.nodeValue); if (!m) continue; const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length); const b = r.getBoundingClientRect(); if (b.width && b.top >= lim.top && b.bottom <= lim.bottom) return true; } return false; };
  return { time: seen(/18:30/), guests: seen(/60 guests/), platters: seen(/Antipasto/), dietaries: seen(/4 gluten free/), place: seen(/Function room/) };
}
/* rendered text contrast (WCAG relative luminance), against the nearest painted background */
function contrast(list) {
  const rgb = c => (c.match(/[\d.]+/g) || []).slice(0, 4).map(Number);
  const lum = c => { const v = rgb(c).slice(0, 3).map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return Math.round((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) * 100) / 100; };
  const bgOf = e => { for (; e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; const a = rgb(b); if (b && !(a.length === 4 && a[3] === 0) && !/transparent/.test(b)) return b; } return 'rgb(255, 255, 255)'; };
  const out = {};
  list.forEach(([k, s, kind]) => {
    const e = [...document.querySelectorAll(s)].find(x => x.getClientRects().length); if (!e) return;
    const cs = getComputedStyle(e);
    if (kind === 'edge') { const bg = bgOf(e.parentElement); out[k] = { edge: cs.borderTopColor, bg, ratio: ratio(cs.borderTopColor, bg) }; return; }
    if (kind === 'fill') { const bg = bgOf(e.parentElement); out[k] = { fill: cs.backgroundColor, bg, ratio: ratio(cs.backgroundColor, bg) }; return; }
    out[k] = { fg: cs.color, bg: bgOf(e), ratio: ratio(cs.color, bgOf(e)), sizePx: parseFloat(cs.fontSize), weight: cs.fontWeight };
  });
  return out;
}
const CARD_C = [['card heading "Function heads-up"', '.fn-hu:not([hidden]) .hm-pt'], ['card count "1 of 2 this week"', '.fn-hu:not([hidden]) .fn-hu-n'], ['card day "THU 12 NOV · IN 2 DAYS"', '.fn-hu:not([hidden]) .fn-hu-when'],
  ['card name', '.fn-hu:not([hidden]) .fn-hu-name'], ['card place, guests, event', '.fn-hu:not([hidden]) .fn-hu-sub'], ['card fact labels', '.fn-hu:not([hidden]) .fn-hu-facts dt'], ['card facts', '.fn-hu:not([hidden]) .fn-hu-facts dd'],
  ['Got it (white on orange)', '.fn-hu:not([hidden]) .fn-hu-got'], ['Got it against the card (control edge)', '.fn-hu:not([hidden]) .fn-hu-got', 'fill'], ['Open the function', '.fn-hu:not([hidden]) .fn-hu-open'],
  ['Also this week', '.fn-hu:not([hidden]) .fn-hu-also'], ['Also this week day', '.fn-hu:not([hidden]) .fn-hu-also b'], ['card foot (what Got it does)', '.fn-hu:not([hidden]) .fn-hu-foot']];
const LINE_C = p => [['line label "Next function"', p + ' .fa-next-k'], ['line date', p + ' .fa-next-d'], ['line words', p + ' .fa-next-t'], ['line name', p + ' .fa-next-n'], ['+1 more this week', p + ' .fa-next-more'],
  ['+1 more this week edge', p + ' .fa-next-more', 'edge'], ['line strip against the page', p, 'fill']];

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ executablePath: EXE });
  const M = { source: 'Preview: the recommended mix, static pages built from the implemented-app snapshots at main 184174e (../baseline), synthetic data, bundled Barlow, Barlow Condensed and Caveat fonts, Chromium headless shell 1243, deviceScaleFactor 1, built ' + new Date().toISOString().slice(0, 10),
    pages: {}, baseline: {}, gotIt: {}, minus: {}, openOnly: {}, taps: {}, contrast: {}, frames: {}, overflow: {}, jsErrors: [] };
  const ctxFor = (w, h) => browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const shot = (p, name, full) => p.screenshot({ path: path.join(shots, name + '.png'), fullPage: !!full });
  const H = { 390: 844, 768: 1024, 1280: 900 };

  // 1. the deliverable pages, viewport and full page
  const PAGES = [['home', 390], ['home', 768], ['home', 1280], ['home-after', 390], ['prep', 390], ['orders', 390], ['home-head-1280', 1280], ['fn-week', 390]];
  for (const [name, w] of PAGES) {
    const ctx = await ctxFor(w, H[w]), p = await open(ctx, DIR + name + '.html');
    const tag = name === 'home-head-1280' ? name : name + '-' + w;
    await shot(p, tag); await shot(p, tag + '-full', true);
    const m = /^home/.test(name) ? await p.evaluate(homeMeasure) : /prep|orders/.test(name) ? await p.evaluate(listMeasure) : {};
    M.pages[tag] = Object.assign({ viewport: w + 'x' + H[w], overflow: await overflow(p) }, m);
    if (p.errs.length) M.jsErrors.push({ page: tag, errs: p.errs });
    await ctx.close();
  }
  // the settled Home after Got it on both, and Dev on the shared tablet
  for (const [k, f, w] of [['home-settled-390', 'states/d2-home-got', 390], ['home-settled-768', 'states/d2-home-got', 768], ['home-settled-1280', 'states/d2-home-got', 1280], ['home-dev-handover-390', 'states/s-handover-dev', 390]]) {
    const ctx = await ctxFor(w, H[w]), p = await open(ctx, DIR + f + '.html');
    M.pages[k] = Object.assign({ viewport: w + 'x' + H[w], overflow: await overflow(p) }, await p.evaluate(homeMeasure));
    if (/settled-390/.test(k)) { await shot(p, k); await shot(p, k + '-full', true); }
    await ctx.close();
  }
  // 2. the same measures on the baseline snapshots (before)
  for (const [k, file, w] of [['home-390', 'home-staff', 390], ['home-768', 'home-staff', 768], ['home-1280', 'home-staff', 1280], ['home-head-1280', 'home-head-1280', 1280], ['prep-390', 'prep-staff', 390], ['orders-390', 'orders-staff', 390], ['prep-day-before-390', 'prep-staff-day-before', 390], ['prep-on-the-day-390', 'prep-staff-on-the-day', 390]]) {
    const ctx = await ctxFor(w, H[w]), p = await open(ctx, BASE + file + '.html');
    M.baseline[k] = Object.assign({ overflow: await overflow(p) }, /home/.test(k) ? await p.evaluate(homeMeasure) : await p.evaluate(listMeasure));
    await ctx.close();
  }

  // 3. Got it, exercised on home.html at 390: collapse in place, the next card, the slip, Undo, the last Got it
  { const ctx = await ctxFor(390, 844), p = await open(ctx, DIR + 'home.html');
    const state = () => p.evaluate(() => {
      const top = s => { const e = document.querySelector(s); return e && !e.hidden ? Math.round(e.getBoundingClientRect().top + scrollY) : null; };
      const sl = document.getElementById('fma-slip');
      return { cardSmith: top('#hu-smith'), line: top('#fma-line'), cardJones: top('#hu-jones'), moreLink: (() => { const m = document.querySelector('#fma-more'); return !!m && m.getClientRects().length > 0; })(), onWithYou: top('#hm-with'),
        slip: sl && !sl.hidden ? sl.querySelector('.p-toast-msg').textContent : null, focus: document.activeElement && (document.activeElement.className + ' ' + (document.activeElement.textContent || '').trim().slice(0, 30)) };
    });
    const before = await state();
    await p.click('#hu-smith [data-fma="got"]'); await p.waitForTimeout(80);
    const afterSmith = await state(); await shot(p, 'home-390-after-got-it-exercised');
    await p.click('#fma-slip [data-fma="undo"]'); await p.waitForTimeout(80);
    const afterUndo = await state();
    await p.click('#hu-smith [data-fma="got"]'); await p.waitForTimeout(80);
    await p.click('#hu-jones [data-fma="got"]'); await p.waitForTimeout(80);
    const afterBoth = await state(); await shot(p, 'home-390-after-both-exercised');
    M.gotIt = { before, afterGotItOnSmith: afterSmith, afterUndo, afterGotItOnBoth: afterBoth,
      collapsedInPlace: afterSmith.line === before.cardSmith, undoRestores: afterUndo.cardSmith === before.cardSmith && afterUndo.line === null };
    if (p.errs.length) M.jsErrors.push({ page: 'home got it', errs: p.errs });
    await ctx.close(); }

  // 4. the minus on Prep: hidden for the day with the slip, then Undo
  { const ctx = await ctxFor(390, 844), p = await open(ctx, DIR + 'prep.html');
    const before = await p.evaluate(listMeasure);
    await p.click('#fn-band [data-fn="fold"]'); await p.waitForTimeout(80);
    const hid = await p.evaluate(() => ({ band: document.getElementById('fn-band').hidden, slip: document.querySelector('#fma-slip .p-toast-msg').textContent }));
    const rows = await p.evaluate(listMeasure); await shot(p, 'prep-390-hidden');
    await p.click('#fma-slip [data-fma="undo"]'); await p.waitForTimeout(80);
    const back = await p.evaluate(() => ({ band: !document.getElementById('fn-band').hidden, focus: document.activeElement && document.activeElement.getAttribute('data-fn'), height: Math.round(document.getElementById('fn-band').getBoundingClientRect().height) }));
    M.minus = { before: { band: before.addedAboveList, rows: before.rowsAboveAdd }, afterMinus: Object.assign(hid, { rowsAboveAdd: rows.rowsAboveAdd }), afterUndo: back,
      spokenLabel: await p.evaluate(() => document.querySelector('#fn-band [data-fn="fold"]').getAttribute('aria-label')) };
    await ctx.close(); }

  // 5. B's open-only rule: open Prep (and Orders), then change the data; the slot keeps its height and the rows stay put
  for (const page of ['prep', 'orders']) for (const w of [390, 768, 1280]) for (const kind of ['booking', 'nosignal', 'midnight', 'cancelled']) {
    if (page === 'orders' && w !== 390) continue;
    const ctx = await ctxFor(w, H[w]), p = await open(ctx, DIR + page + '.html');
    const b0 = await p.evaluate(listMeasure);
    const ok = await p.evaluate(k => window.fmaSim(k), kind); await p.waitForTimeout(60);
    const b1 = await p.evaluate(listMeasure);
    const fit = await p.evaluate(() => { const b = document.getElementById('fn-band'), n = b.querySelector('.fa-next'); return { slot: Math.round(b.getBoundingClientRect().height), words: Math.round(n.getBoundingClientRect().height), clipped: b.scrollHeight > b.clientHeight + 1 || n.getBoundingClientRect().height > b.clientHeight + 1, label: b.querySelector('.fa-next-l').textContent, text: b.querySelector('.fa-next-t').textContent }; });
    if (w === 390 && page === 'prep') await shot(p, 'prep-390-' + kind + '-while-open');
    M.openOnly[page + '-' + w + '-' + kind] = { simulated: ok, slotAtOpen: b0.addedAboveList, slotAfter: b1.addedAboveList, firstRowTopAtOpen: b0.firstRowTop, firstRowTopAfter: b1.firstRowTop, listMoved: b1.firstRowTop - b0.firstRowTop, wordsFit: !fit.clipped, wordsHeight: fit.words, label: fit.label, text: fit.text };
    await ctx.close();
  }
  // without the rule: what the same booking does when the page is opened again (the band's own Order today line)
  { const ctx = await ctxFor(390, 844), p = await open(ctx, DIR + 'states/s-booking-reopen.html'), m = await p.evaluate(listMeasure);
    M.openOnly.reopenedAfterBooking390 = { band: m.addedAboveList, firstRowTop: m.firstRowTop, rowsAboveAdd: m.rowsAboveAdd,
      wouldHaveMovedMidViewPx: m.firstRowTop - M.openOnly['prep-390-booking'].firstRowTopAtOpen, note: 'If the slot were repainted live (design A without the rule), every row would drop this far under a finger at 14:05. With the rule this happens only when Prep is opened again.' };
    await ctx.close(); }

  // 6. taps to see time, guests, platters and dietaries
  { const ctx = await ctxFor(390, 844);
    let p = await open(ctx, DIR + 'home.html');
    M.taps.homeNotSeen = { taps: 0, visibleOnOpen: await p.evaluate(factsVisible, null) };
    await p.close();
    p = await open(ctx, DIR + 'states/d2-home-got.html');
    const onOpen = await p.evaluate(() => { const l = document.querySelector('#fma-line'); return { lineTop: Math.round(l.getBoundingClientRect().top), name: l.querySelector('.fa-next-n').textContent }; });
    await p.click('#fma-line .fa-next-b'); await p.waitForTimeout(200);
    M.taps.homeAfterGotIt = Object.assign({ taps: 1, how: 'tap the Next function line' }, onOpen, { visibleAfterOneTap: await p.evaluate(factsVisible, 'smith') });
    await shot(p, 'home-settled-390-sheet');
    await p.close();
    p = await open(ctx, DIR + 'prep.html');
    await p.click('#fn-band .fa-next-b'); await p.waitForTimeout(200);
    M.taps.prep = { taps: 1, how: 'tap the Next function line', visibleAfterOneTap: await p.evaluate(factsVisible, 'smith') };
    await shot(p, 'prep-390-sheet');
    await p.close();
    p = await open(ctx, DIR + 'prep.html');
    await p.click('#fn-band .fa-next-more'); await p.waitForLoadState('load'); await p.evaluate(() => document.fonts.ready);
    M.taps.prepSaturday = { taps: 1, how: 'tap +1 more this week: Functions, the next 7 days', jonesCardTop: await p.evaluate(() => { const e = [...document.querySelectorAll('.fn-card')].find(c => /Jones wedding/.test(c.textContent)); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : null; }) };
    M.taps.baseline = 'From the baseline (design-a/spec.md, same snapshots): Home 1 tap after a scroll of about 360 px (Coming up at 955 to 998 px); Prep 2 taps and a scroll (chef hat, Functions); Saturday 3 taps from Prep (#/fn showed 3 days).';
    await ctx.close(); }

  // 7. contrast of the new pieces, rendered
  { const ctx = await ctxFor(390, 844);
    const run = async (k, url, list, pre) => { const p = await open(ctx, DIR + url); if (pre) await p.evaluate(pre); M.contrast[k] = await p.evaluate(contrast, list); await p.close(); };
    await run('home card (heads-up)', 'home.html', CARD_C);
    await run('home line (after Got it)', 'states/d2-home-got.html', LINE_C('#fma-line'));
    await run('work-page line', 'prep.html', LINE_C('#fn-band').concat([['minus', '#fn-band .fn-fold'], ['minus edge', '#fn-band .fn-fold', 'edge']]));
    await run('no signal words', 'prep.html', [['"No signal · updated 13:52"', '#fn-band .fa-next-k'], ['name', '#fn-band .fa-next-n'], ['date words', '#fn-band .fa-next-t']], () => window.fmaSim('nosignal'));
    await run('booking words', 'prep.html', [['Order today tag (ink words)', '#fn-band .fn-t-order'], ['date', '#fn-band .fa-next-d'], ['words', '#fn-band .fa-next-t']], () => window.fmaSim('booking'));
    await run('midnight words', 'prep.html', [['Tomorrow tag', '#fn-band .fn-t-tom'], ['words', '#fn-band .fa-next-t']], () => window.fmaSim('midnight'));
    await run('cancelled line', 'prep.html', [['Cancelled tag', '#fn-band .fn-t-off'], ['words', '#fn-band .fa-next-t']], () => window.fmaSim('cancelled'));
    await run('Orders tag', 'orders.html', [['"Not ordered yet" (ink words on the tint)', '.nb-marks .fn-t-order'], ['"For Sat 14 Nov"', '.ru-ometa'], ['"order day was Sun 8 Nov · Gus"', '.ru-ometa + *, .nb-meta']]);
    await run('slip', 'home-after.html', [['slip words', '#fma-slip .p-toast-msg'], ['Undo', '#fma-slip .p-toast-btn']]);
    await run('cancelled card', 'states/s-cancelled-home.html', [['heading', '.fn-hu.is-off .hm-pt'], ['day', '.fn-hu.is-off .fn-hu-when'], ['words', '.fn-hu.is-off .fn-hu-sub'], ['foot', '.fn-hu.is-off .fn-hu-foot'], ['Got it (plain)', '.fn-hu.is-off .fn-hu-got'], ['Got it edge', '.fn-hu.is-off .fn-hu-got', 'edge']]);
    await run('changed card', 'states/s-changed-home.html', [['Changed tag', '.fn-hu .fn-t-new'], ['change words', '.fn-hu-chg li'], ['who and when', '.fn-hu-chg li span']]);
    await run('tomorrow card', 'states/d1-home.html', [['Tomorrow tag', '.fn-hu .fn-t-tom'], ['lines', '.fn-hu-line']]);
    await run('booked today card', 'states/s-booking-home.html', [['Booked today tag', '.fn-hu .fn-t-new']]);
    await ctx.close(); }

  // 8. every frame at 390 x 844: a shot each, Home positions and what sits above the list
  for (const f of built.frames) {
    const ctx = await ctxFor(390, 844), p = await open(ctx, DIR + 'states/' + f + '.html');
    await shot(p, 'states/' + f);
    const isHome = await p.evaluate(() => !!document.querySelector('.is-home'));
    const m = isHome ? await p.evaluate(homeMeasure) : await p.evaluate(listMeasure);
    M.frames[f] = isHome ? { smithTop: m.smithTop, smithOnFirstScreen: m.smithOnFirstScreen, slot: m.slot.map(s => s.id + ' ' + s.height + ' px'), onWithYouTop: m.onWithYou && m.onWithYou.top, coworkerRowsOnFirstScreen: m.coworkerRowsOnFirstScreen }
      : { band: m.addedAboveList, rowsAboveAdd: m.rowsAboveAdd, firstRowTop: m.firstRowTop };
    if (p.errs.length) M.jsErrors.push({ page: f, errs: p.errs });
    await ctx.close();
  }

  // 9. sideways scroll at every width, every page and frame
  const all = built.pages.map(n => DIR + n).concat(built.frames.map(f => DIR + 'states/' + f + '.html'), [DIR + 'runup.html']);
  for (const w of [390, 768, 1280]) {
    const ctx = await ctxFor(w, H[w]);
    for (const u of all) { const p = await open(ctx, u); M.overflow[u.replace(DIR, '') + '@' + w] = await overflow(p); if (p.errs.length) M.jsErrors.push({ page: u + '@' + w, errs: p.errs }); await p.close(); }
    await ctx.close();
  }
  M.overflowNonZero = Object.entries(M.overflow).filter(([, v]) => v).map(([k]) => k);
  M.overflowChecks = Object.keys(M.overflow).length;

  // 10. the run-up sheet, full page (iframes loaded and their fonts ready)
  { const ctx = await ctxFor(1280, 900), p = await open(ctx, DIR + 'runup.html');
    await p.waitForFunction(() => [...document.querySelectorAll('iframe')].every(f => f.contentDocument && f.contentDocument.documentElement.getAttribute('data-fma-ready') === '1'), null, { timeout: 20000 });
    await p.waitForTimeout(300);
    await shot(p, 'runup-full', true);
    M.pages['runup-1280'] = { overflow: await overflow(p), frames: (await p.$$('iframe')).length };
    await ctx.close(); }

  fs.writeFileSync(path.join(here, 'measurements.json'), JSON.stringify(M, null, 2) + '\n');
  console.log(JSON.stringify({ pages: M.pages, gotIt: M.gotIt, minus: M.minus, taps: M.taps, overflowNonZero: M.overflowNonZero, overflowChecks: M.overflowChecks, jsErrors: M.jsErrors }, null, 1));
  await browser.close(); server.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
