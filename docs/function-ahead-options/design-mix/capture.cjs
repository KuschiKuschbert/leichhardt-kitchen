/* Combined preview capture (functions ahead of time, round 2, 10 Nov 2026). Preview measurements only.
   Builds the pages, serves the repo root on 127.0.0.1:8794 with Node http, opens each page in Chromium headless shell at
   deviceScaleFactor 1, waits for document.fonts.ready (and for src/mix.js to lock the slot), saves shots/ and writes
   measurements.json. The same measures run on the baseline snapshots (../baseline/*.html), so before and after use one
   method. Every number is Preview. Revised after the focused review (10 Nov 2026): Got it answered in place (the next
   card's buttons checked for cover), the slot sized for its tallest words at default, large and extra-large text with a
   37 character name, a function today breaking the lock, Home's lock, the busy week, the gaps around +N more and the
   minus.
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
/* is a control fully on the first screen and not covered by anything (the slip, the tab bar)? Five points each */
function clearOf(sel) {
  const e = document.querySelector(sel); if (!e || !e.getClientRects().length) return { found: false };
  const tab = document.querySelector('.tabbar'), tabOn = tab && getComputedStyle(tab).display !== 'none' && tab.getBoundingClientRect().height > 0;
  const lim = tabOn ? tab.getBoundingClientRect().top : innerHeight, b = e.getBoundingClientRect();
  // the centre, a point in from each side (clear of rounded corners, which a tap does not reach either), top and bottom
  const pts = [[b.left + b.width / 2, b.top + b.height / 2], [b.left + Math.min(b.height / 2, b.width / 4), b.top + b.height / 2], [b.right - Math.min(b.height / 2, b.width / 4), b.top + b.height / 2], [b.left + b.width / 2, b.top + 3], [b.left + b.width / 2, b.bottom - 3]];
  const hit = pts.map(([x, y]) => { const h = document.elementFromPoint(x, y); return !!h && (h === e || e.contains(h)); });
  return { found: true, top: Math.round(b.top), bottom: Math.round(b.bottom), firstScreenBottom: Math.round(lim), onFirstScreen: b.top >= 0 && b.bottom <= lim, unobstructed: hit.every(Boolean), pointsHit: hit.filter(Boolean).length + ' of 5' };
}
/* the work-page slot: do its status words, "+N more" and the minus all fit whole inside it? */
function slotFit() {
  const b = document.getElementById('fn-band'); if (!b || b.hidden) return null;
  const r = e => e && e.getClientRects().length ? e.getBoundingClientRect() : null, sb = r(b);
  const l = b.querySelector('.fa-next-l'), st = b.querySelector('.fa-next-s'), d = b.querySelector('.fa-next-d'), n = b.querySelector('.fa-next-n'), x = b.querySelector('.fa-next-x');
  const more = b.querySelector('.fa-next-more'), fold = b.querySelector('.fn-fold'), chev = b.querySelector('.fa-next-chev');
  const inside = q => !q || (q.top >= sb.top - 0.5 && q.bottom <= sb.bottom + 0.5 && q.left >= sb.left - 0.5 && q.right <= sb.right + 0.5);
  const sR = r(st), lR = r(l), mR = r(more), fR = r(fold), tR = r(b.querySelector('.fa-next-t'));
  return {
    slot: Math.round(sb.height), lockedAt: +b.getAttribute('data-fma-h') || null, setsMeasuredAtOpen: b.getAttribute('data-fma-sets'),
    label: l.textContent.replace(/ /g, ' '), name: n.textContent,
    statusWordsWhole: !!sR && sR.right <= lR.right + 0.5 && inside(sR), labelRowOneLine: !!lR && lR.height < 1.6 * parseFloat(getComputedStyle(l).fontSize) * 1.25,
    dateShortened: !!d && d.scrollWidth > d.clientWidth + 0.5, nameShortened: !!n && n.scrollWidth > n.clientWidth + 0.5,
    shortPartShown: !!x && !!tR && x.getBoundingClientRect().top - tR.top < 2,
    moreWhole: !mR || (inside(mR) && more.scrollWidth <= more.clientWidth + 1 && more.scrollHeight <= more.clientHeight + 1), moreText: more ? more.textContent : null,
    minusWhole: !fR || inside(fR), chevronShown: !!chev && !!r(chev),
    wordsHeight: Math.round(r(b.querySelector('.fa-next')).height)
  };
}
/* the gaps around +N more and the minus: to each other, and to the top bar's round chips above them */
function gaps() {
  const b = document.getElementById('fn-band'); if (!b || b.hidden) return null;
  const more = b.querySelector('.fa-next-more'), fold = b.querySelector('.fn-fold');
  const chips = [...document.querySelectorAll('.wtop .wtop-btn, .wtop .wtop-back')].filter(e => e.getClientRects().length).map(e => e.getBoundingClientRect());
  const low = chips.length ? Math.max(...chips.map(c => c.bottom)) : null, mR = more && more.getClientRects().length ? more.getBoundingClientRect() : null, fR = fold.getBoundingClientRect();
  return { moreToMinusPx: mR ? Math.round(fR.left - mR.right) : null, chipsToMorePx: mR && low != null ? Math.round(mR.top - low) : null, chipsToMinusPx: low != null ? Math.round(fR.top - low) : null };
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
const CARD_C = [['card heading "Function this week"', '.fn-hu:not([hidden]) .hm-pt'], ['card count "1 of 2 this week"', '.fn-hu:not([hidden]) .fn-hu-n'], ['card day "THU 12 NOV · IN 2 DAYS"', '.fn-hu:not([hidden]) .fn-hu-when'],
  ['card name', '.fn-hu:not([hidden]) .fn-hu-name'], ['card place, guests, event', '.fn-hu:not([hidden]) .fn-hu-sub'], ['card fact labels', '.fn-hu:not([hidden]) .fn-hu-facts dt'], ['card facts', '.fn-hu:not([hidden]) .fn-hu-facts dd'],
  ['Got it (white on orange)', '.fn-hu:not([hidden]) .fn-hu-got'], ['Got it against the card (control edge)', '.fn-hu:not([hidden]) .fn-hu-got', 'fill'], ['Open the function', '.fn-hu:not([hidden]) .fn-hu-open'],
  ['Also this week', '.fn-hu:not([hidden]) .fn-hu-also'], ['Also this week day', '.fn-hu:not([hidden]) .fn-hu-also b'], ['card foot (what Got it does)', '.fn-hu:not([hidden]) .fn-hu-foot']];
const LINE_C = p => [['line label "Next function"', p + ' .fa-next-k'], ['line date', p + ' .fa-next-d'], ['line words', p + ' .fa-next-x'], ['line name', p + ' .fa-next-n'], ['+1 more this week', p + ' .fa-next-more'],
  ['+1 more this week edge', p + ' .fa-next-more', 'edge'], ['line strip against the page', p, 'fill'], ['chevron (graphic, needs 3:1)', p + ' .fa-next-chev']];

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ executablePath: EXE });
  const M = { source: 'Preview: the recommended mix, revised after the focused review, static pages built from the implemented-app snapshots at main 184174e (../baseline), synthetic data, bundled Barlow, Barlow Condensed and Caveat fonts, Chromium headless shell 1243, deviceScaleFactor 1, built ' + new Date().toISOString().slice(0, 10),
    pages: {}, baseline: {}, gotIt: {}, minus: {}, openOnly: {}, taps: {}, contrast: {}, frames: {}, overflow: {}, jsErrors: [] };
  const ctxFor = (w, h) => browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const shot = (p, name, full) => p.screenshot({ path: path.join(shots, name + '.png'), fullPage: !!full });
  const H = { 390: 844, 768: 1024, 1280: 900 };

  // 1. the deliverable pages, viewport and full page
  const PAGES = [['home', 390], ['home', 768], ['home', 1280], ['home-after', 390], ['prep', 390], ['prep', 768], ['prep', 1280], ['prep-long', 390], ['orders', 390], ['home-head-1280', 1280], ['fn-week', 390], ['home-busy', 390]];
  for (const [name, w] of PAGES) {
    const ctx = await ctxFor(w, H[w]), p = await open(ctx, DIR + name + '.html');
    const tag = name === 'home-head-1280' ? name : name + '-' + w;
    await shot(p, tag); if (w === 390 || /^home/.test(name)) await shot(p, tag + '-full', true);
    const m = /^home/.test(name) ? await p.evaluate(homeMeasure) : /prep|orders/.test(name) ? Object.assign(await p.evaluate(listMeasure), { slotFit: await p.evaluate(slotFit), gaps: await p.evaluate(gaps) }) : {};
    M.pages[tag] = Object.assign({ viewport: w + 'x' + H[w], overflow: await overflow(p) }, m);
    if (p.errs.length) M.jsErrors.push({ page: tag, errs: p.errs });
    await ctx.close();
  }
  // the settled Home after Got it on both, Dev on the shared tablet, and the busy week (3 and 5 not yet seen)
  for (const [k, f, w] of [['home-settled-390', 'states/d2-home-got', 390], ['home-settled-768', 'states/d2-home-got', 768], ['home-settled-1280', 'states/d2-home-got', 1280], ['home-dev-handover-390', 'states/s-handover-dev', 390],
    ['home-busy3-390', 'states/s-busy3-home', 390], ['home-busy5-390', 'states/s-busy5-home', 390], ['home-busy3-settled-390', 'states/s-busy3-got', 390], ['home-busy5-settled-390', 'states/s-busy5-settled', 390],
    ['home-busy5-768', 'states/s-busy5-home', 768], ['home-busy5-1280', 'states/s-busy5-home', 1280]]) {
    const ctx = await ctxFor(w, H[w]), p = await open(ctx, DIR + f + '.html');
    if (/busy3-settled/.test(k)) await p.evaluate(() => window.fmaAckEnd());
    M.pages[k] = Object.assign({ viewport: w + 'x' + H[w], overflow: await overflow(p) }, await p.evaluate(homeMeasure));
    if (/busy/.test(k)) M.pages[k].busyCard = await p.evaluate(() => { const c = document.getElementById('hu-week'); if (!c || c.hidden) return null; const b = c.getBoundingClientRect(); return { top: Math.round(b.top + scrollY), height: Math.round(b.height), rows: c.querySelectorAll('.fn-wk-r').length, rowHeights: [...c.querySelectorAll('.fn-wk-r')].map(r => Math.round(r.getBoundingClientRect().height)) }; });
    if (/busy[35]-390/.test(k)) M.pages[k].gotItButton = await p.evaluate(clearOf, '#hu-week [data-fma="got"]');
    if (/settled-390|busy[35]-390/.test(k)) { await shot(p, k); await shot(p, k + '-full', true); }
    await ctx.close();
  }
  // 2. the same measures on the baseline snapshots (before)
  for (const [k, file, w] of [['home-390', 'home-staff', 390], ['home-768', 'home-staff', 768], ['home-1280', 'home-staff', 1280], ['home-head-1280', 'home-head-1280', 1280], ['prep-390', 'prep-staff', 390], ['orders-390', 'orders-staff', 390], ['prep-day-before-390', 'prep-staff-day-before', 390], ['prep-on-the-day-390', 'prep-staff-on-the-day', 390]]) {
    const ctx = await ctxFor(w, H[w]), p = await open(ctx, BASE + file + '.html');
    M.baseline[k] = Object.assign({ overflow: await overflow(p) }, /home/.test(k) ? await p.evaluate(homeMeasure) : await p.evaluate(listMeasure));
    await ctx.close();
  }

  // 3. Got it, exercised on home.html at 390 (and at large and extra-large text): the card collapses in place to the line,
  // the line answers with Undo inside it (no bottom slip), the next card's Got it and Open the function stay clear
  for (const text of ['', 'large', 'xlarge']) {
    const ctx = await ctxFor(390, 844), p = await open(ctx, DIR + 'home.html' + (text ? '?text=' + text : ''));
    const state = () => p.evaluate(() => {
      const box = s => { const e = document.querySelector(s); if (!e || e.hidden || !e.getClientRects().length) return null; const b = e.getBoundingClientRect(); return { top: Math.round(b.top + scrollY), height: Math.round(b.height) }; };
      const sl = document.getElementById('fma-slip'), n = document.querySelector('#fma-line .fa-next'), ack = n && n.querySelector('.fa-next-ack');
      return { cardSmith: box('#hu-smith'), line: box('#fma-line'), cardJones: box('#hu-jones'), moreLink: (() => { const m = document.querySelector('#fma-more'); return !!m && m.getClientRects().length > 0; })(), onWithYou: box('#hm-with'),
        bottomSlip: sl && !sl.hidden ? sl.querySelector('.p-toast-msg').textContent : null,
        lineAnswer: n && n.classList.contains('is-ack') ? { words: ack.textContent, whole: ack.scrollWidth <= ack.clientWidth + 0.5, undoInLine: !!n.querySelector('.fa-next-undo').getClientRects().length, said: n.querySelector('[data-fma-sr]').textContent } : null,
        focus: document.activeElement && (document.activeElement.className + ' ' + (document.activeElement.textContent || '').trim().slice(0, 30)) };
    });
    const before = await state();
    const gotSmith = await p.evaluate(() => { const b = document.querySelector('#hu-smith [data-fma="got"]').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; });
    await p.click('#hu-smith [data-fma="got"]'); await p.waitForTimeout(80);
    const afterSmith = await state();
    const nextCard = { gotIt: await p.evaluate(clearOf, '#hu-jones [data-fma="got"]'), openTheFunction: await p.evaluate(clearOf, '#hu-jones .fn-hu-open'), undoInLine: await p.evaluate(clearOf, '#fma-line .fa-next-undo') };
    const doubleTapLandsOn = await p.evaluate(([x, y]) => { const h = document.elementFromPoint(x, y); return h ? (h.closest('button, a') ? h.closest('button, a').textContent.trim().slice(0, 30) + ' (a control)' : (h.className || h.tagName) + ': ' + (h.textContent || '').trim().slice(0, 30)) : null; }, gotSmith);
    if (!text) await shot(p, 'home-390-after-got-it-exercised');
    await p.evaluate(() => window.fmaAckEnd());   // the 9 s pass
    const afterAnswer = await state();
    if (!text) await shot(p, 'home-390-after-got-it-answer-gone');
    const r = { before, afterGotItOnSmith: afterSmith, nextCardAfterGotIt: nextCard, doubleTapOnTheOldGotItLandsOn: doubleTapLandsOn, afterTheAnswerGoes: afterAnswer,
      collapsedInPlace: !!afterSmith.line && afterSmith.line.top === before.cardSmith.top, noBottomSlip: afterSmith.bottomSlip === null,
      lineHeightSameWithAndWithoutAnswer: !!afterSmith.line && !!afterAnswer.line && afterSmith.line.height === afterAnswer.line.height,
      nextCardMovedWhenAnswerWent: afterSmith.cardJones && afterAnswer.cardJones ? afterAnswer.cardJones.top - afterSmith.cardJones.top : null };
    // a fresh page for Undo and for both Got its
    await p.goto(ORIGIN + DIR + 'home.html' + (text ? '?text=' + text : ''), { waitUntil: 'load' }); await p.waitForFunction(() => document.documentElement.getAttribute('data-fma-ready') === '1');
    await p.click('#hu-smith [data-fma="got"]'); await p.waitForTimeout(60);
    await p.click('#fma-line .fa-next-undo'); await p.waitForTimeout(60);
    r.afterUndo = await state();
    r.undoRestores = !!r.afterUndo.cardSmith && r.afterUndo.cardSmith.top === before.cardSmith.top && r.afterUndo.line === null;
    await p.click('#hu-smith [data-fma="got"]'); await p.waitForTimeout(60);
    await p.click('#hu-jones [data-fma="got"]'); await p.waitForTimeout(60);
    r.afterGotItOnBoth = await state();
    if (!text) await shot(p, 'home-390-after-both-exercised');
    await p.evaluate(() => window.fmaAckEnd());
    r.afterBothAnswerGone = await state();
    if (p.errs.length) M.jsErrors.push({ page: 'home got it ' + text, errs: p.errs });
    M.gotIt[text || 'default'] = r;
    await ctx.close();
  }
  // the busy week: one Got it for all, answered in the line, +N more after
  for (const n of [3, 5]) {
    const ctx = await ctxFor(390, 844), p = await open(ctx, DIR + 'states/s-busy' + n + '-home.html');
    const top = () => p.evaluate(() => { const c = document.getElementById('hu-week'), l = document.getElementById('fma-line'), w = document.getElementById('hm-with'); const t = e => e && !e.hidden ? Math.round(e.getBoundingClientRect().top + scrollY) : null; const m = document.getElementById('fma-more'); return { card: t(c), line: t(l), onWithYou: t(w), more: m && m.getClientRects().length ? m.textContent : null, answer: document.querySelector('#fma-line .is-ack') ? document.querySelector('#fma-line .fa-next-ack').textContent : null }; });
    const b0 = await top();
    await p.click('#hu-week [data-fma="got"]'); await p.waitForTimeout(60);
    const b1 = await top();
    await p.evaluate(() => window.fmaAckEnd());
    const b2 = await top();
    M.gotIt['busy' + n] = { before: b0, justAfterGotIt: b1, afterTheAnswer: b2, collapsedInPlace: b1.line === b0.card };
    await ctx.close();
  }

  // 4. the minus on Prep: hidden for this person on this phone today, with the slip, then Undo
  { const ctx = await ctxFor(390, 844), p = await open(ctx, DIR + 'prep.html');
    const before = await p.evaluate(listMeasure);
    await p.click('#fn-band [data-fn="fold"]'); await p.waitForTimeout(80);
    const hid = await p.evaluate(() => ({ band: document.getElementById('fn-band').hidden, slip: document.querySelector('#fma-slip .p-toast-msg').textContent }));
    const rows = await p.evaluate(listMeasure); await shot(p, 'prep-390-hidden');
    await p.click('#fma-slip [data-fma="undo"]'); await p.waitForTimeout(80);
    const back = await p.evaluate(() => ({ band: !document.getElementById('fn-band').hidden, focus: document.activeElement && document.activeElement.getAttribute('data-fn'), height: Math.round(document.getElementById('fn-band').getBoundingClientRect().height) }));
    M.minus = { key: 'lk.fn.ahead.fold: { day, staffId }, apart from the band\'s lk.fn.fold; a different staff id signed in on the device shows the line again (states/s-hidden-dev.html)',
      before: { band: before.addedAboveList, rows: before.rowsAboveAdd }, afterMinus: Object.assign(hid, { rowsAboveAdd: rows.rowsAboveAdd }), afterUndo: back,
      spokenLabel: await p.evaluate(() => document.querySelector('#fn-band [data-fn="fold"]').getAttribute('aria-label')) };
    await ctx.close(); }

  // 5. B's open-only rule: open Prep (and Orders), then change the data; the slot keeps its height and the rows stay put
  for (const page of ['prep', 'orders']) for (const w of [390, 768, 1280]) for (const kind of ['booking', 'nosignal', 'midnight', 'cancelled']) {
    if (page === 'orders' && w !== 390) continue;
    const ctx = await ctxFor(w, H[w]), p = await open(ctx, DIR + page + '.html');
    const b0 = await p.evaluate(listMeasure);
    const ok = await p.evaluate(k => window.fmaSim(k), kind); await p.waitForTimeout(60);
    const b1 = await p.evaluate(listMeasure), fit = await p.evaluate(slotFit);
    if (w === 390 && page === 'prep') await shot(p, 'prep-390-' + kind + '-while-open');
    M.openOnly[page + '-' + w + '-' + kind] = { simulated: ok, slotAtOpen: b0.addedAboveList, slotAfter: b1.addedAboveList, firstRowTopAtOpen: b0.firstRowTop, firstRowTopAfter: b1.firstRowTop, listMoved: b1.firstRowTop - b0.firstRowTop,
      wordsFit: fit.statusWordsWhole && fit.labelRowOneLine && fit.moreWhole && fit.minusWhole, wordsHeight: fit.wordsHeight, label: fit.label, name: fit.name };
    await ctx.close();
  }
  // without the rule: what the same booking does when the page is opened again (the band's own Order today line)
  { const ctx = await ctxFor(390, 844), p = await open(ctx, DIR + 'states/s-booking-reopen.html'), m = await p.evaluate(listMeasure);
    M.openOnly.reopenedAfterBooking390 = { band: m.addedAboveList, firstRowTop: m.firstRowTop, rowsAboveAdd: m.rowsAboveAdd,
      wouldHaveMovedMidViewPx: m.firstRowTop - M.openOnly['prep-390-booking'].firstRowTopAtOpen, note: 'If the slot were repainted live (design A without the rule), every row would drop this far under a finger at 14:05. With the rule this happens only when Prep is opened again.' };
    await ctx.close(); }
  // the one exception: a function booked for today while Prep is open draws the full band at once
  for (const w of [390, 768, 1280]) {
    const ctx = await ctxFor(w, H[w]), p = await open(ctx, DIR + 'prep.html');
    const b0 = await p.evaluate(listMeasure);
    await p.evaluate(() => window.fmaSim('today')); await p.waitForTimeout(60);
    const b1 = await p.evaluate(listMeasure);
    if (w === 390) await shot(p, 'prep-390-today-while-open');
    M.openOnly['prep-' + w + '-today'] = { lockBroken: await p.evaluate(() => document.documentElement.getAttribute('data-fma-unlocked') === 'today'), slotAtOpen: b0.addedAboveList, bandAfter: b1.addedAboveList,
      listMoved: b1.firstRowTop - b0.firstRowTop, rowsAboveAddBefore: b0.rowsAboveAdd, rowsAboveAddAfter: b1.rowsAboveAdd, why: 'A function today: a missed round is the mistake the band exists to stop (service rule 3), so it draws at once.' };
    await ctx.close();
  }
  M.openOnly.checks = Object.keys(M.openOnly).filter(k => /-(booking|nosignal|midnight|cancelled)$/.test(k)).length;
  M.openOnly.maxListMoved = Math.max(...Object.keys(M.openOnly).filter(k => /-(booking|nosignal|midnight|cancelled)$/.test(k)).map(k => Math.abs(M.openOnly[k].listMoved)));
  M.openOnly.allWordsFit = Object.keys(M.openOnly).filter(k => /-(booking|nosignal|midnight|cancelled)$/.test(k)).every(k => M.openOnly[k].wordsFit);

  // 5b. the slot at the text size settings (js/boot.js data-text, css/app.css: large 112.5%, extra large 125%), with
  // Smith 60th and with the 37 character "Robertson and Nguyen engagement party", every change while Prep is open
  M.textSizes = { note: 'Root font size raised as Settings does (html[data-text]: large 112.5%, xlarge 125%). The slot is sized at open for the tallest of its five word sets; the list must not move and nothing may be cut except the name (and the short part after it).', runs: {} };
  for (const page of ['prep-long', 'prep']) for (const text of ['', 'large', 'xlarge']) for (const w of (page === 'prep-long' ? [390, 768, 1280] : [390])) {
    if (w !== 390 && text) continue;
    for (const kind of ['cancelled', 'booking', 'nosignal', 'midnight']) {
      const ctx = await ctxFor(w, H[w]), p = await open(ctx, DIR + page + '.html' + (text ? '?text=' + text : ''));
      const b0 = await p.evaluate(listMeasure), atOpen = await p.evaluate(slotFit);
      await p.evaluate(k => window.fmaSim(k), kind); await p.waitForTimeout(40);
      const b1 = await p.evaluate(listMeasure), fit = await p.evaluate(slotFit), g = await p.evaluate(gaps);
      if (page === 'prep-long' && kind === 'cancelled' && w === 390) await shot(p, 'prep-long-390-cancelled-' + (text || 'default'));
      M.textSizes.runs[page + '-' + w + '-' + (text || 'default') + '-' + kind] = { slotAtOpen: atOpen.slot, setsMeasuredAtOpen: atOpen.setsMeasuredAtOpen, slotAfter: fit.slot, listMoved: b1.firstRowTop - b0.firstRowTop,
        label: fit.label, statusWordsWhole: fit.statusWordsWhole, labelRowOneLine: fit.labelRowOneLine, dateShortened: fit.dateShortened, nameShortened: fit.nameShortened, shortPartShown: fit.shortPartShown,
        moreWhole: fit.moreWhole, minusWhole: fit.minusWhole, chevronShown: fit.chevronShown, rowsAboveAdd: b1.rowsAboveAdd, gaps: g, overflow: await overflow(p) };
      await ctx.close();
    }
  }
  { const runs = Object.values(M.textSizes.runs);
    M.textSizes.summary = { runs: runs.length, listMovedMax: Math.max(...runs.map(r => Math.abs(r.listMoved))), statusWordsWholeAll: runs.every(r => r.statusWordsWhole && r.labelRowOneLine), moreWholeAll: runs.every(r => r.moreWhole), minusWholeAll: runs.every(r => r.minusWhole),
      dateShortenedIn: Object.keys(M.textSizes.runs).filter(k => M.textSizes.runs[k].dateShortened), overflowNonZero: Object.keys(M.textSizes.runs).filter(k => M.textSizes.runs[k].overflow),
      minMoreToMinusPx: Math.min(...runs.map(r => r.gaps.moreToMinusPx)), minChipsToMorePx: Math.min(...runs.map(r => r.gaps.chipsToMorePx)), minChipsToMinusPx: Math.min(...runs.map(r => r.gaps.chipsToMinusPx)),
      slotHeightAt390: { default: M.textSizes.runs['prep-390-default-cancelled'].slotAtOpen, large: M.textSizes.runs['prep-390-large-cancelled'].slotAtOpen, xlarge: M.textSizes.runs['prep-390-xlarge-cancelled'].slotAtOpen },
      rowsAboveAddAt390: { default: M.textSizes.runs['prep-390-default-cancelled'].rowsAboveAdd, large: M.textSizes.runs['prep-390-large-cancelled'].rowsAboveAdd, xlarge: M.textSizes.runs['prep-390-xlarge-cancelled'].rowsAboveAdd } }; }
  // the baseline Prep at the same text sizes, for the rows comparison
  for (const text of ['large', 'xlarge']) {
    const ctx = await ctxFor(390, 844), p = await ctx.newPage();
    await p.goto(ORIGIN + BASE + 'prep-staff.html', { waitUntil: 'load' }); await p.evaluate(t => document.documentElement.setAttribute('data-text', t), text); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(100);
    M.baseline['prep-390-' + text] = await p.evaluate(listMeasure);
    await ctx.close();
  }

  // 5c. Home keeps the same lock: a booking while Home is open changes the line's words only, no card inserts itself
  { const ctx = await ctxFor(390, 844), p = await open(ctx, DIR + 'states/s-home-open-booking.html?nosim');
    const look = () => p.evaluate(() => ({ onWithYouTop: Math.round(document.getElementById('hm-with').getBoundingClientRect().top + scrollY), cards: [...document.querySelectorAll('.fn-hu')].filter(c => !c.hidden).length, more: (document.querySelector('#fma-line .fa-next-more') || {}).textContent || null, lineHeight: Math.round(document.getElementById('fma-line').getBoundingClientRect().height) }));
    const a0 = await look(); await p.evaluate(() => window.fmaSim('home-booking')); await p.waitForTimeout(40); const a1 = await look();
    M.homeLock = { atOpen: a0, afterBookingWhileOpen: a1, onWithYouMoved: a1.onWithYouTop - a0.onWithYouTop, cardInserted: a1.cards > a0.cards, nextOpen: 'states/s-booking-home.html: the Booked today card under the line' };
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
    await p.close();
    p = await open(ctx, DIR + 'states/s-busy5-home.html');
    await p.click('#hu-week .fn-wk-r[data-id="brown"]'); await p.waitForTimeout(200);
    M.taps.busyWeekRow = { taps: 1, how: 'tap a row on the Functions this week card (Brown christening, Sun 15 Nov)', sheetOpen: await p.evaluate(() => !!document.querySelector('#fa-sheet-brown.fn-pop')) };
    M.taps.chevron = { home: await (async () => { const q = await open(ctx, DIR + 'states/d2-home-got.html'); const v = await q.evaluate(() => !!document.querySelector('#fma-line .fa-next-chev').getClientRects().length); await q.close(); return v; })(),
      workPage390: 'see textSizes: shown at default and large text, left out at extra-large on a phone so the status words keep their room' };
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
    await run('cancelled line', 'prep.html', [['Cancelled tag', '#fn-band .fn-t-off'], ['"Do not prep"', '#fn-band .fa-next-stop'], ['name', '#fn-band .fa-next-n'], ['day', '#fn-band .fa-next-x']], () => window.fmaSim('cancelled'));
    await run('Orders tag', 'orders.html', [['"Not ordered yet" (ink words on the tint)', '.nb-marks .fn-t-order'], ['"For Sat 14 Nov"', '.ru-ometa'], ['"order day was Sun 8 Nov · Gus"', '.ru-ometa + *, .nb-meta']]);
    await run('Got it answer in the line', 'states/s-two-2.html', [['"Got it. Kept here as one line"', '#fma-line .fa-next-ack'], ['Undo in the line (white on ink)', '#fma-line .fa-next-undo'], ['Undo against the line (control edge)', '#fma-line .fa-next-undo', 'fill'], ['name', '#fma-line .fa-next-n']]);
    await run('work-page slip (the minus)', 'states/s-hidden.html', [['slip words', '#fma-slip .p-toast-msg'], ['Undo', '#fma-slip .p-toast-btn']]);
    await run('busy week card', 'states/s-busy5-home.html', [['heading', '#hu-week .hm-pt'], ['count', '#hu-week .fn-hu-n'], ['row day', '#hu-week .fn-wk-d'], ['row weekday', '#hu-week .fn-wk-d b'], ['row name', '#hu-week .fn-wk-n'], ['row guests', '#hu-week .fn-wk-g'], ['row food, platters, dietaries', '#hu-week .fn-wk-2'], ['row chevron (graphic)', '#hu-week .fa-next-chev'], ['foot', '#hu-week .fn-hu-foot']]);
    await run('cancelled card', 'states/s-cancelled-home.html', [['heading', '.fn-hu.is-off .hm-pt'], ['day', '.fn-hu.is-off .fn-hu-when'], ['words', '.fn-hu.is-off .fn-hu-sub'], ['foot', '.fn-hu.is-off .fn-hu-foot'], ['Got it (plain)', '.fn-hu.is-off .fn-hu-got'], ['Got it edge', '.fn-hu.is-off .fn-hu-got', 'edge']]);
    await run('changed card', 'states/s-changed-home.html', [['Changed tag', '.fn-hu .fn-t-new'], ['change words', '.fn-hu-chg li'], ['who and when', '.fn-hu-chg li span']]);
    await run('tomorrow card', 'states/d1-home.html', [['Tomorrow tag', '.fn-hu .fn-t-tom'], ['lines', '.fn-hu-line'], ['foot "Everyone sees this once"', '.fn-hu .fn-hu-foot']]);
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
  console.log(JSON.stringify({ gotIt: M.gotIt, textSizes: M.textSizes.summary, openOnly: { checks: M.openOnly.checks, maxListMoved: M.openOnly.maxListMoved, allWordsFit: M.openOnly.allWordsFit, today: M.openOnly['prep-390-today'] }, homeLock: M.homeLock, minus: M.minus, overflowNonZero: M.overflowNonZero, overflowChecks: M.overflowChecks, jsErrors: M.jsErrors }, null, 1));
  await browser.close(); server.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
