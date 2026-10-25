// Approved Layout 2: staff print bookings and the full service day; coordinators can print the unsaved form.
// Native dialogs are stood in for. Chromium still lays out real A4 PDFs from the print stylesheet.
const fs = require('fs'), path = require('path');
const L = require('./lib'), M = require('../js/functions.js');
const { R, ok } = L.results();
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW)), tomorrow = M.addDays(today, 1), yesterday = M.addDays(today, -1);
const at = (d, t) => M.kat(d, M.hmMin(t));
const people = L.seed()[key(['config', 'main'])].people.concat({ id: 'finn', name: 'Finn', role: 'fnc', active: true, fn: true });
const config = { people, sousIds: ['sam'], staffIds: people.map(p => p.id), fnIds: ['finn'], showBadges: true };
function booking(name, date, times, split) {
  const names = ['Pizza Platter', 'Aussie Platter', 'Vege Platter', 'Yumcha Platter', 'Antipasto Platter', 'Seafood Platter'];
  const ids = ['pizza', 'aussie', 'vege', 'yumcha', 'antipasto', 'seafood'];
  return M.derive({ name, date, status: 'confirmed', v: 3, start: at(date, '18:00'), loc: 'Example function area', guests: 60, mode: times.length > 1 ? 'stag' : 'all',
    rounds: times.map((t, i) => ({ at: at(date, t), note: 'Round ' + (i + 1) + ' note' })),
    lines: split.map((a, i) => ({ rid: ids[i % 6] + '-platter', name: names[i % 6], unit: 'platter', qty: a.reduce((s, v) => s + v, 0), u: M.toU(a), spec: '', fp: '' })),
    notes: 'Keep sauces with the matching platters.\nConfirm dietary requests with the function lead.', kc: 'Wait for the function lead before the final round.', kcBy: 'finn', kcAt: L.NOW - 3600000,
    by: 'finn', upd: L.NOW - 3600000, confBy: 'finn', confAt: L.NOW - 86400000, was: {}, chg: [] });
}
const main = booking('Birthday celebration', today, ['18:30', '19:00', '19:30'], [[2, 1, 1], [1, 1, 1], [1, 1, 0], [1, 1, 1], [2, 0, 0], [0, 1, 1]]);
function seed(docs) {
  return Object.assign({
    [key(['config', 'main'])]: config,
    [key(['pinset', 'finn'])]: { at: 1 }, [key(['staffpins', 'finn'])]: { hash: L.sha('lk:finn:5252') },
    [key(['drinks', 'finn'])]: { kind: 'flat', at: 1, by: 'finn' },
    [key(['fncontact', 'birthday'])]: { cname: 'Private contact', phone: '0400 111 222', email: 'private@example.com', upd: 1 }
  }, ...Object.keys(docs).map(id => ({ [key(['functions', id])]: docs[id] })));
}
const stats = p => p.evaluate(() => ({ reads: window.__fake.bill.length, writes: window.__fake.writes.length, docs: JSON.stringify(window.__fake.dump()) }));
async function intercept(p) {
  await p.evaluate(() => { window.__printCalls = 0; window.print = () => { window.__printCalls++; }; });
}
async function print(p, selector) {
  const before = await p.evaluate(() => window.__printCalls);
  await p.click(selector);
  await L.waitFor(p, count => window.__printCalls === count + 1 && !!document.getElementById('fn-print'), before);
  return p.$eval('#fn-print', e => e.textContent);
}
async function closePrint(p) { await p.evaluate(() => window.dispatchEvent(new Event('afterprint'))); }
async function a4(p, filename) {
  const bytes = await p.pdf({ preferCSSPageSize: true, printBackground: false });
  fs.mkdirSync(path.join(__dirname, 'shots'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'shots', filename), bytes);
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    ok(Math.abs(page.view[2] - 595.28) < 1 && Math.abs(page.view[3] - 841.89) < 1, filename + ': page ' + i + ' is A4 portrait');
    text += (await page.getTextContent()).items.map(item => item.str).join(' ') + '\n';
  }
  return { pages: pdf.numPages, text };
}

(async () => {
  const browser = await L.start();
  let p;
  try {
    // A staff phone can print a complete booking, without loading the manager's script or contact record.
    p = await L.open(browser, '#/fn/birthday', { who: 'ann', extra: seed({ birthday: main }), width: 390 });
    await L.waitFor(p, () => !!document.querySelector('[data-fn="print"]'));
    await intercept(p);
    const before = await stats(p), hash = await p.evaluate(() => location.hash);
    let content = await print(p, '[data-fn="print"]');
    ok(/Birthday celebration/.test(content) && /Total booked \/ 16 platters/.test(content), 'staff: print includes the whole booking and the correct total');
    const rounds = await p.$$eval('#fn-print .fn-paper-round', rows => rows.map(e => e.textContent));
    ok(rounds.length === 3 && /18:307 platters/.test(rounds[0]) && /19:005 platters/.test(rounds[1]) && /19:304 platters/.test(rounds[2]), 'staff: all three rounds have the correct times and 7, 5, 4 allocation');
    ok(/Service & dietary notes/.test(content) && /Wait for the function lead/.test(content) && /Finn/.test(content) && /Version 3/.test(content) && /AEST/.test(content), 'staff: notes, comment author, version and Queensland print time are included');
    ok(!/Private contact|0400|private@example/.test(content) && !(await p.$('#fn-print input, #fn-print button, #fn-print a')), 'staff: paper includes no contact fields or app controls');
    const pdf = await a4(p, 'function-print-layout-2.pdf');
    ok(pdf.pages === 1, 'Layout 2: the six-platter, three-round example fits one A4 page');
    ok(/Birthday celebration/.test(pdf.text) && !/Kitchen Book|My section|Private contact|private@example/.test(pdf.text), 'PDF: only the function sheet prints, including when opened above the app');
    const after = await stats(p);
    ok(before.reads === after.reads && before.writes === after.writes && before.docs === after.docs, 'printing performs no database reads or writes');
    ok(!(await p.evaluate(() => !!window.LK_FE)) && !(await p.evaluate(() => window.__fake.readLog.some(k => /\/fncontact\//.test(k)))), 'staff: printing never loads the editor or reads booking contacts');
    await print(p, '[data-fn="print"]');
    ok((await p.$$('#fn-print')).length === 1, 'mobile fallback: another tap works even if the browser omitted afterprint');
    await closePrint(p);
    ok(await p.evaluate(h => !document.getElementById('fn-print') && !document.body.classList.contains('fn-printing') && location.hash === h && !document.querySelector('[data-fn="print"]').disabled, hash), 'closing the dialog removes the paper copy and restores the same staff screen');
    for (const width of [390, 768, 1280]) { await p.setViewportSize({ width, height: 900 }); await L.settle(p, 100); ok(!(await L.overflow(p)), 'staff print control fits at ' + width + ' px'); }
    await p.goto(L.BASE + '#/fn');
    await L.waitFor(p, () => !!document.querySelector('#fn-band [data-fn="open"][data-id="birthday"]'));
    await p.click('#fn-band [data-fn="open"][data-id="birthday"]');
    await print(p, '.fn-pop [data-fn="print"]');
    await p.emulateMedia({ media: 'print' });
    ok(await p.evaluate(() => getComputedStyle(document.querySelector('.fn-pop')).display === 'none' && getComputedStyle(document.getElementById('fn-print')).display === 'block'), 'popup: only the timed sheet prints, with the overlay and app hidden');
    await p.emulateMedia({ media: 'screen' });
    await closePrint(p);
    await p.keyboard.press('Escape');
    await p.close();

    // Service prints every round for the full day, including completed and overnight functions, in food-time order.
    const early = booking('Already finished', today, ['09:30'], [[1]]);
    const future = booking('Tomorrow only', tomorrow, ['18:30'], [[1]]);
    const overnight = booking('Overnight booking', yesterday, ['23:30'], [[2, 1]]);
    overnight.rounds.push({ at: at(today, '00:30'), note: 'Next day round' }); M.derive(overnight);
    const cancelled = Object.assign({}, main, { status: 'cancelled', name: 'Cancelled booking' }); M.derive(cancelled);
    const draft = Object.assign({}, main, { status: 'draft', name: 'Draft booking' }); M.derive(draft);
    const serviceSeed = seed({ birthday: main, early, future, overnight, cancelled, draft });
    serviceSeed[key(['fnsent', 'birthday_' + main.rounds[0].at])] = { fid: 'birthday', at: main.rounds[0].at, day: today, sent: true, sentAt: L.NOW - 60000, sentBy: 'ann' };
    p = await L.open(browser, '#/fn/now', { who: 'bo', extra: serviceSeed });
    await L.waitFor(p, () => { const b = document.querySelector('[data-fn="print-day"]'); return b && !b.disabled; });
    await intercept(p);
    content = await print(p, '[data-fn="print-day"]');
    const titles = await p.$$eval('#fn-print .fn-paper h1', nodes => nodes.map(e => e.textContent));
    ok(JSON.stringify(titles) === JSON.stringify(['Overnight booking', 'Already finished', 'Birthday celebration']), 'service: prints the full day in food-time order, excludes drafts, cancelled and tomorrow-only bookings');
    ok(/next day/.test(content) && /00:30/.test(content) && /23:30/.test(content), 'service: overnight rounds retain their dates and next-day label');
    ok((await p.$$('#fn-print .fn-paper-tick.is-sent')).length === 1, 'service: a round already sent keeps its printed tick and send time');
    await closePrint(p);
    await p.evaluate(() => { const F = window.LK_FN.state(); F.offline = true; F.cached = true; });
    content = await print(p, '[data-fn="print-day"]');
    ok(/Saved copy \/ last read/.test(content), 'offline: paper clearly identifies the cached copy');
    await closePrint(p);
    await p.close();

    p = await L.open(browser, '#/fn/cancelled', { who: 'ann', extra: seed({ cancelled }) });
    await L.waitFor(p, () => !!document.querySelector('[data-fn="print"]'));
    await intercept(p);
    content = await print(p, '[data-fn="print"]');
    ok(/Cancelled \/ do not send/.test(content) && !(await p.$('#fn-print .fn-paper-tick')), 'cancelled copy: prominent do-not-send label and no dispatch ticks');
    await closePrint(p);
    await p.close();

    // A coordinator prints current input, including an unblurred time, without saving or confirming it.
    p = await L.open(browser, '#/functions/birthday', { who: 'finn', extra: seed({ birthday: main }) });
    await L.waitFor(p, () => !!document.querySelector('[data-fe="print"]'));
    await intercept(p);
    await p.fill('[data-ff="notes"]', 'Unsaved kitchen note <img src=x onerror=alert(1)>');
    await p.fill('[data-ff="startT"]', '17:45');
    const formBefore = await stats(p);
    content = await print(p, '[data-fe="print"]');
    ok(/Draft \/ not saved/.test(content) && /17:45/.test(content) && /Unsaved kitchen note/.test(content), 'form: prints current pending input with an unmistakable unsaved label');
    ok(!/Private contact|private@example|0400/.test(content) && !(await p.$('#fn-print img')), 'form: contacts are excluded and typed markup is printed as plain words');
    const formAfter = await stats(p);
    ok(formBefore.reads === formAfter.reads && formBefore.writes === formAfter.writes && formBefore.docs === formAfter.docs, 'form: printing does not save, confirm or change the stored booking');
    await closePrint(p);
    ok((await p.inputValue('[data-ff="notes"]')).includes('Unsaved kitchen note') && await p.evaluate(() => window.LK_FE.dirty()), 'form: cancelling printing keeps all unsaved changes in the form');
    await p.focus('[data-fe="print"]');
    const calls = await p.evaluate(() => window.__printCalls);
    await p.keyboard.press('Enter');
    await L.waitFor(p, n => window.__printCalls === n + 1, calls);
    ok(!!(await p.$('#fn-print')), 'keyboard: Enter on Print opens the same run sheet');
    await closePrint(p);
    // A stale lazy-loaded file produces a readable reload fallback rather than a JavaScript error.
    await p.evaluate(() => { window.__keepPrint = window.LK_FN.print; window.LK_FN.print = null; });
    await p.click('[data-fe="print"]');
    ok(/Reload the book/.test(await L.txt(p, '.fe-toasts')), 'form: mixed file versions ask for a reload and keep the draft');
    await p.evaluate(() => { window.LK_FN.print = window.__keepPrint; });
    await p.close();

    p = await L.open(browser, '#/functions/new', { who: 'finn', extra: seed({}) });
    await L.waitFor(p, () => !!document.querySelector('[data-fe="print"]'));
    await intercept(p);
    content = await print(p, '[data-fe="print"]');
    ok(/Draft \/ not saved/.test(content) && /TBC/.test(content) && /Still to check/.test(content) && !/NaN|undefined/.test(content), 'new function: incomplete drafts print with TBC and the outstanding fields');
    await closePrint(p);
    await p.close();

    // Very long notes and the maximum 12 lines / 8 rounds paginate instead of being clipped or shrunk.
    const large = booking('Large function', today, ['18:00', '18:20', '18:40', '19:00', '19:20', '19:40', '20:00', '20:20'], Array.from({ length: 12 }, () => [1, 1, 1, 1, 1, 1, 1, 1]));
    large.notes = ('A detailed service note to read before sending the next round.\n').repeat(15) + 'SERVICE-NOTES-END';
    large.kc = ('A kitchen handover note that must remain readable on paper.\n').repeat(28) + 'KITCHEN-COMMENT-END';
    p = await L.open(browser, '#/fn/large', { who: 'ann', extra: seed({ large }), width: 1280 });
    await L.waitFor(p, () => !!document.querySelector('[data-fn="print"]'));
    await intercept(p);
    await print(p, '[data-fn="print"]');
    const longPdf = await a4(p, 'function-print-long.pdf');
    ok(longPdf.pages > 1 && /SERVICE-NOTES-END/.test(longPdf.text) && /KITCHEN-COMMENT-END/.test(longPdf.text) && /Round 8/.test(longPdf.text), 'large copy: every round and the end of both long notes survive pagination');
    await closePrint(p);
    await p.evaluate(() => { window.print = () => { throw new Error('No printing'); }; });
    await p.click('[data-fn="print"]');
    await L.waitFor(p, () => !document.getElementById('fn-print'));
    ok(!(await p.$('body.fn-printing')) && !(await p.$eval('[data-fn="print"]', b => b.disabled)) && /Could not open printing/.test(await L.txt(p, '.fn-print-error')), 'printing failure: removes print state, shows a visible message and enables retry');
    await p.evaluate(() => { window.print = undefined; });
    await p.click('[data-fn="print"]');
    ok(/Printing is not available/.test(await L.txt(p, '.fn-print-error')), 'unsupported browser: a visible message explains how to open printing');
    await p.close();

    p = await L.open(browser, '#/fn/now', { who: 'ann', extra: seed({ future }) });
    await L.waitFor(p, () => !!document.querySelector('[data-fn="print-day"]'));
    ok(await p.$eval('[data-fn="print-day"]', e => e.disabled), 'empty service day: the print button is disabled instead of printing a blank sheet');
    await p.close(); p = null;
  } finally {
    if (p && !p.isClosed()) await p.close();
    await browser.close();
  }
  L.report(R);
})().catch(e => { console.error(e); process.exitCode = 1; });
