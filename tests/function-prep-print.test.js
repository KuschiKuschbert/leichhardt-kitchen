// Combined daily prep: real A4 PDFs, counts by kitchen day, current recipe cards and no database work.
const fs = require('fs'), path = require('path');
const L = require('./lib'), M = require('../js/functions.js');
const { R, ok } = L.results();
const today = L.ymd(new Date(L.NOW)), tomorrow = M.addDays(today, 1), yesterday = M.addDays(today, -1);
const key = id => ['kitchens', L.PIN, 'functions', id].join('/');
const ids = ['pizza', 'aussie', 'vege', 'yumcha', 'antipasto', 'seafood'];
function booking(name, date, time, quantities) {
  return M.derive({ name, date, status: 'confirmed', v: 1, start: M.kat(date, M.hmMin(time)), loc: 'Function room', guests: 40, mode: 'all',
    rounds: [{ at: M.kat(date, M.hmMin(time)), note: '' }],
    lines: quantities.map((q, i) => ({ rid: ids[i] + '-platter', name: ids[i] + ' Platter', unit: 'platter', qty: q, u: Array(q).fill(0), spec: '', fp: '' })),
    notes: 'Check dietary requests.', kc: '', upd: L.NOW - 60000, by: 'sam' });
}
async function print(p, day) {
  await p.click('[data-fn="print-prep"][data-day="' + day + '"]');
  await L.waitFor(p, () => window.__printed && !!document.querySelector('.fn-prep-paper'));
}
async function close(p) { await p.evaluate(() => { window.dispatchEvent(new Event('afterprint')); window.__printed = false; }); }
async function pdf(p, filename) {
  const bytes = await p.pdf({ preferCSSPageSize: true, printBackground: false });
  fs.mkdirSync(path.join(__dirname, 'shots'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'shots', filename), bytes);
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise;
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    ok(Math.abs(page.view[2] - 841.89) < 1 && Math.abs(page.view[3] - 595.28) < 1, filename + ': A4 landscape page ' + i);
    text += (await page.getTextContent()).items.map(i => i.str).join(' ');
  }
  return { pages: doc.numPages, text };
}
(async () => {
  const browser = await L.start(); let p;
  try {
    const early = booking('Lunch function', today, '12:30', [1, 2, 1, 2, 1, 1]);
    const later = booking('Evening function', today, '18:30', [2, 1, 2, 1, 1, 2]);
    const future = booking('Tomorrow function', tomorrow, '18:00', [3]);
    const cancelled = Object.assign({}, early, { name: 'Cancelled function', status: 'cancelled' });
    const draft = Object.assign({}, later, { name: 'Draft function', status: 'draft' });
    const overnight = booking('Overnight function', yesterday, '23:30', [3]);
    overnight.mode = 'stag'; overnight.rounds.push({ at: M.kat(today, 30), note: 'After midnight' }); overnight.lines[0].u = [0, 0, 1]; M.derive(overnight);
    p = await L.open(browser, '#/fn', { who: 'ann', width: 390, extra: { [key('early')]: early, [key('later')]: later, [key('future')]: future, [key('cancelled')]: cancelled, [key('draft')]: draft, [key('overnight')]: overnight } });
    await L.waitFor(p, () => !!document.querySelector('[data-fn="print-prep"]:not(:disabled)'));
    await p.evaluate(() => { window.print = () => { window.__printed = true; }; });
    const before = await p.evaluate(() => [window.__fake.bill.length, window.__fake.writes.length, JSON.stringify(window.__fake.dump())]);
    await print(p, today);
    let content = await p.$eval('#fn-print', el => el.textContent);
    const rows = await p.$$eval('.fn-prep-overview tbody tr', els => els.map(el => el.textContent));
    ok(rows.length === 3 && /Overnight function/.test(rows[0]) && /Lunch function/.test(rows[1]) && /Evening function/.test(rows[2]), 'one overview includes every confirmed function in food-time order, even lunch already finished');
    ok(!/Tomorrow function|Cancelled function|Draft function|23:30/.test(content), 'only this day prints: no drafts, cancellations, tomorrow or yesterday rounds');
    const totals = await p.$$eval('.fn-prep-overview tfoot .fn-prep-number', els => els.map(el => el.textContent));
    ok(JSON.stringify(totals) === JSON.stringify(['4', '3', '3', '3', '2', '3']), 'totals add both functions and only the one after-midnight platter from the overnight function');
    ok((await p.$$('.fn-prep-card')).length === 6 && (await p.$$('.fn-prep-art svg path')).length > 6, 'all six platter references and real book drawings print once each');
    ok(/1\/2 slab|Margherita pizza/.test(content) && /10ea/.test(content) && /Per platter/.test(content), 'recipe quantities remain per platter');
    const standard = await pdf(p, 'function-prep-sheet.pdf');
    ok(standard.pages === 1 && /Lunch function/.test(standard.text) && /Seafood Platter/i.test(standard.text), 'three functions and all six platter drawings and ingredient tables fit one A4 cheat sheet');
    const after = await p.evaluate(() => [window.__fake.bill.length, window.__fake.writes.length, JSON.stringify(window.__fake.dump())]);
    ok(JSON.stringify(before) === JSON.stringify(after), 'prep printing adds no reads, writes or saved data');
    ok(!(await p.$('#fn-print a, #fn-print button, #fn-print input')) && !(await p.evaluate(() => window.__fake.readLog.some(k => /\/fncontact\//.test(k)))), 'no booking contacts, app controls or editor are loaded');
    await close(p);
    for (const width of [390, 768, 1280]) { await p.setViewportSize({ width, height: 900 }); await L.settle(p, 100); ok(!(await L.overflow(p)), 'prep controls fit at ' + width + ' px'); }
    await print(p, tomorrow);
    content = await p.$eval('#fn-print', el => el.textContent);
    ok(/Tomorrow function/.test(content) && !/Evening function|Lunch function/.test(content), 'upcoming day button prints that day alone');
    await close(p);
    await p.goto(L.BASE + '#/fn/now');
    await L.waitFor(p, () => !!document.querySelector('[data-fn="print-prep"]:not(:disabled)'));
    await p.evaluate(() => { window.print = () => { window.__printed = true; }; });
    await print(p, today);
    ok((await p.$$('.fn-prep-overview tbody tr')).length === 3, 'Service View offers the same full-day prep sheet');
    await close(p);
    await p.evaluate(() => {
      const r = window.LK_DATA.recipes.find(r => r.id === 'pizza-platter');
      r.ingredients[0].name = '<img src=x onerror=alert(1)> Updated recipe';
      r.ingredients[0].q = '[Amount to confirm]';
      r.ingredients[0].note = 'Long recipe note. '.repeat(120) + 'END OF NOTE';
      window.LK_ART.plates[r.art] = '<script>alert(1)</script><path onmouseover="alert(1)" d="M0 0L10 10"/>';
      window.LK_DATA.recipes = window.LK_DATA.recipes.filter(r => r.id !== 'aussie-platter');
    });
    await print(p, today);
    content = await p.$eval('#fn-print', el => el.textContent);
    ok(/Updated recipe/.test(content) && /\[Amount to confirm\]/.test(content) && /Recipe missing from the book/.test(content), 'current recipe edits and missing booked recipes appear without made-up replacements');
    ok(!(await p.$('#fn-print img, #fn-print script, #fn-print [onmouseover]')), 'typed text is escaped and SVG is sanitised at print time');
    const long = await pdf(p, 'function-prep-sheet-long.pdf');
    ok(/END OF NOTE/.test(long.text), 'long material continues rather than being clipped or dropped');
    await close(p); await p.close();
    p = await L.open(browser, '#/fn', { who: 'ann' });
    await L.waitFor(p, () => !!document.querySelector('[data-fn="print-prep"]'));
    ok((await p.$$('.fn-page [data-fn="print-prep"]:not(:disabled)')).length === 0, 'no functions disables printing rather than producing an empty sheet');
    await p.close();
  } catch (e) { ok(false, e.stack || String(e)); }
  finally { await browser.close(); }
  L.report(R);
})();
