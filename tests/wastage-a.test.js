// Wastage, Clean notebook (3 Nov 2026, work pages redesign A, docs/work-pages-design-options/brief.md): today's total
// and a bar of the reasons come first, then Log waste (and the end-of-day review for chefs), then the entries. The form
// opens as a sheet with the five reasons as big chips; the review has its own sheet. Make it again (a piece of B) puts
// a cooking fault or expired stock on today's prep list in one tap, with Undo.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const today = L.ymd(new Date(L.NOW));
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const store = p => p.evaluate(() => window.__fake.dump());
const extra = {};
[['w1', 'Chips', 2, 'kg', 'excess', 'Fryer'], ['w2', 'Rice', 1.5, 'kg', 'expired', 'Pans'], ['w3', 'Hollandaise', 1, 'L', 'fault', 'Sauce']].forEach(([id, t, a, u, r, s], k) => {
  extra[fsKey(['waste', today, 'lines', id])] = { text: t, amount: a, unit: u, reason: r, action: '', station: s, addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - (30 - k) * 60000, deleted: false };
});
const prepLines = async (p, text) => Object.entries(await store(p)).filter(([k, v]) => k.indexOf(fsKey(['days', today, 'items'])) === 0 && v.text === text);
(async () => {
  const b = await L.start();

  // the page: today first, the form behind Log waste
  let p = await L.open(b, '#/waste', { who: 'sam', extra, wait: 1600 });
  // as drawn in the agreed design: Log waste docked above the tab bar, the review one button at the foot of the entries
  const order = await p.evaluate(() => ['.w-today', '.nb-rows', '.w-rvbtn'].map(s => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top) : -1; }));
  ok(order.every((y, i) => y >= 0 && (!i || y >= order[i - 1])) && await L.docked(p, '.w-logbtn'), 'page: the total, the entries, then the review at the foot, with Log waste docked above the tab bar (' + order.join(', ') + ')');
  ok(/3\.5 kg, 1 L/.test(await txt(p, '.w-tot') || '') && /logged today/.test(await txt(p, '.w-tot') || ''), 'page: today\'s total (' + await txt(p, '.w-tot') + ')');
  const legend = await p.$$eval('.w-legend li', l => l.map(e => e.textContent.trim()));
  ok(legend.join(' | ') === 'Expired stock 1 | Cooking fault 1 | Excess production 1' && (await p.$$('.w-bar .w-seg')).length === 3, 'page: one bar part and one key line per reason (' + legend.join(' | ') + ')');
  ok(!(await p.$('#w-text')) && !(await p.$('.w-rule')), 'page: no form and no rule line until Log waste');

  // Log waste: a sheet over a dimmed page, the cursor in What was wasted?
  await p.click('[data-p="w-log"]'); await L.settle(p, 250);
  ok(await p.evaluate(() => { const s = document.querySelector('.w-sheet'); return !!s && s.getAttribute('role') === 'dialog' && !!document.querySelector('.sheet-bg') && document.activeElement && document.activeElement.id === 'w-text'; }), 'Log waste: a sheet over a dimmed page, the cursor in What was wasted?');
  const rs = await p.$$eval('.w-rbig [data-p="wreason"]', l => l.map(e => e.querySelector('strong').textContent));
  ok(rs.length === 5 && !(await p.$('.w-sheet .ux-picker-trigger')) && !(await p.$('.w-rbtn')), 'Log waste: the five reasons as big chips, no Choose button (' + rs.join(', ') + ')');
  ok(/actual amount and unit/.test(await txt(p, '.w-sheet .w-rule') || ''), 'Log waste: the rule line is in the sheet');
  await p.fill('#w-text', 'Bread rolls');
  await p.keyboard.press('Escape'); await L.settle(p, 200);
  ok(!(await p.$('.w-sheet')) && await p.evaluate(() => document.activeElement && document.activeElement.classList.contains('w-logbtn')), 'Escape closes it, back on Log waste');
  await L.wLog(p);
  ok(await p.inputValue('#w-text') === 'Bread rolls', 'the words typed are still there when it opens again');
  await p.mouse.click(195, 40); await L.settle(p, 200);
  ok(!(await p.$('.w-sheet')), 'a tap on the dimmed page closes it');
  await L.wLog(p);
  await p.fill('#w-amt', '8'); await p.click('[data-p="wunit"][data-v="pieces"]');
  await p.click('[data-p="wreason"][data-v="fault"]'); await L.settle(p, 100);
  ok(await p.$eval('[data-p="wreason"][data-v="fault"]', e => e.getAttribute('aria-checked') === 'true'), 'a reason chip is picked with one tap');
  await p.click('.w-sheet .nb-addbtn'); await L.settle(p, 500);
  const br = Object.entries(await store(p)).filter(([k, v]) => k.indexOf(fsKey(['waste', today, 'lines'])) === 0 && v.text === 'Bread rolls');
  ok(br.length === 1 && br[0][1].amount === 8 && br[0][1].unit === 'pieces' && br[0][1].reason === 'fault', 'Log it saves the entry (' + JSON.stringify(br.map(x => [x[1].amount, x[1].unit, x[1].reason])) + ')');
  ok(!!(await p.$('.w-sheet')) && await p.inputValue('#w-text') === '' && await p.evaluate(() => document.activeElement && document.activeElement.id === 'w-text') && /^Bread rolls 8 /.test(await txt(p, '.w-sheet .just-l:last-child .just-n') || ''), 'Log it: the sheet stays for the next entry, the cursor back in What was wasted?, a toast with Undo');
  // the toast sits at the top, above the sheet, so its Undo can be tapped (it was under the sheet)
  // since 5 Nov 2026 (step 2b) the receipt in the sheet carries the Undo, under the box: it can be tapped there
  ok(await p.evaluate(() => { const t = document.querySelector('.w-sheet [data-p="just-undo"]'); if (!t) return false; t.scrollIntoView({ block: 'center' }); const r = t.getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === t && !document.querySelector('.p-toast'); }), 'Log it: the toast is above the sheet, where Undo can be tapped');
  await p.click('.w-sheet [data-p="w-log-close"]'); await L.settle(p, 200);
  ok(!(await p.$('.w-sheet')), 'Close closes it');
  ok(/Cooking fault 2/.test(await txt(p, '.w-legend') || ''), 'the key counts the new entry (' + await txt(p, '.w-legend') + ')');

  // Make it again: a cooking fault or expired stock, today, for anyone ticked for Add
  const again = await p.$$eval('[data-p="w-again"]', l => l.map(e => e.getAttribute('data-id')));
  ok(again.includes('w2') && again.includes('w3') && !again.includes('w1'), 'Make it again on expired stock and cooking faults, not on excess (' + again.join(', ') + ')');
  await p.click('[data-p="w-again"][data-id="w3"]'); await L.settle(p, 500);
  let hl = await prepLines(p, 'Hollandaise');
  ok(hl.length === 1 && hl[0][1].station === 'Sauce' && !hl[0][1].deleted && hl[0][1].by === 'sam', 'Make it again: Hollandaise goes on today\'s prep list under Sauce (' + JSON.stringify(hl.map(x => [x[1].station, x[1].by])) + ')');
  ok(/Added to the prep list, Sauce/.test(await txt(p, '.p-toast') || '') && /On the prep list/.test(await txt(p, '[data-ln$="/w3"]') || ''), 'Make it again: a toast with Undo, and the entry says On the prep list');
  await p.click('.p-toast-btn'); await L.settle(p, 400);
  hl = await prepLines(p, 'Hollandaise');
  ok(hl.length === 1 && hl[0][1].deleted === true && !!(await p.$('[data-p="w-again"][data-id="w3"]')), 'Undo takes it off the prep list, and Make it again is back');

  // the end-of-day review, in its own sheet
  ok(/Not written yet/.test(await txt(p, '.w-rvbtn') || ''), 'review: the button says it is not written yet');
  await L.wReview(p);
  ok(await p.evaluate(() => document.activeElement && document.activeElement.id === 'w-ra') && !!(await p.$('.w-sheet [data-p="wreview"][disabled]')), 'review: a sheet, the cursor in the first box, Save off until something is typed');
  await p.fill('#w-ra', 'Hollandaise split'); await p.fill('#w-rc', 'Make it closer to service');
  await p.click('.w-sheet [data-p="wreview"]'); await L.settle(p, 800);
  const rv = (await store(p))[fsKey(['waste', today])] || {};
  ok(rv.avoidable === 'Hollandaise split' && rv.reviewBy === 'Sam' && !(await p.$('.w-sheet')) && /Saved by Sam/.test(await txt(p, '.w-rvbtn') || ''), 'review: Save writes it, closes the sheet, and the button says who saved it');
  ok(!(await L.overflow(p)) && p.errors.length === 0, 'sous chef phone: no sideways scroll, no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // staff: Log waste and Make it again, no review
  p = await L.open(b, '#/waste', { who: 'ann', extra, wait: 1600 });
  ok(!!(await p.$('.w-logbtn')) && !(await p.$('.w-rvbtn')) && (await p.$$('[data-p="w-again"]')).length === 2, 'staff: Log waste and Make it again, no review');
  ok(p.errors.length === 0, 'staff: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // nothing logged yet (the test day's Chips taken off): no total, the empty note, Log waste
  p = await L.open(b, '#/waste', { who: 'ann', wait: 1600, extra: { [fsKey(['waste', today, 'lines', 'w1'])]: { text: 'Chips', amount: 2, unit: 'kg', reason: 'excess', action: '', station: 'Fryer', addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - 60000, deleted: true } } });
  ok(!(await p.$('.w-today')) && /Nothing logged/.test(await txt(p, '.nb-body') || '') && !!(await p.$('.w-logbtn')), 'empty: no total, the empty note and Log waste');
  await p.context().close();

  // the sizes: no sideways scroll on the page or with either sheet open
  for (const [w, h] of [[768, 1024], [1280, 900]]) {
    p = await L.open(b, '#/waste', { who: 'sam', extra, width: w, height: h, wait: 1600 });
    const page = !(await L.overflow(p));
    await L.wLog(p);
    const fits = await p.evaluate(() => { const s = document.querySelector('.w-sheet').getBoundingClientRect(); return s.left >= 0 && s.right <= innerWidth && s.top >= 0 && s.bottom <= innerHeight; });
    ok(page && fits && !(await L.overflow(p)), w + ' px: the page and the Log waste sheet fit, no sideways scroll');
    ok(p.errors.length === 0, w + ' px: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
