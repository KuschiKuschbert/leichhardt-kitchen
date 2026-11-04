// The line's ⋯ on Wastage and Transfers (4 Nov 2026, head chef decision, S4 of the work pages redesign): Change amount
// for the person who logged the line, the head chef or a sous chef, on today's lines (on Transfers, while still out),
// the amount before kept as was, with Undo; Remove and Put back stay with the head chef's Google device. The rules say
// the same (amountChange() in firestore.rules, tests/rules).
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const root = 'kitchens/' + L.PIN + '/', today = L.ymd(new Date(L.NOW));
const store = p => p.evaluate(() => window.__fake.dump());
const extra = {};
extra[root + 'waste/' + today + '/lines/a1'] = { text: 'Chips', amount: 2, unit: 'kg', reason: 'excess', action: '', station: 'Fryer', addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 1800000, deleted: false };
extra[root + 'waste/' + today + '/lines/b1'] = { text: 'Rice', amount: 1, unit: 'kg', reason: 'expired', action: '', station: 'Pans', addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - 1700000, deleted: false };
const xrec = (o) => Object.assign({ dir: 'out', venue: 'Riviera', person: 'Jo', text: 'Butter', amount: 2, unit: 'kg', note: '', addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - 1200000, deleted: false, by: 'bo' }, o || {});
extra[root + 'transfers/' + today + '/lines/t1'] = xrec();
extra[root + 'transferOpen/' + today + '_t1'] = { date: today, lineId: 't1', record: xrec(), open: true, by: 'bo' };
extra[root + 'transfers/' + today + '/lines/t2'] = xrec({ text: 'Lemons', amount: 12, unit: 'pieces', returned: true, returnedBy: 'Bo', returnedById: 'bo', returnedAt: L.NOW - 600000 });
const more = (p, id) => p.$('.nb-row[data-ln$="/' + id + '"] .nb-more');
async function openMenu(p, id) { await p.click('.nb-row[data-ln$="/' + id + '"] .nb-more'); await L.settle(p, 200); }
(async () => {
  const b = await L.start();

  // Ann (staff) on a phone: her own line has the ⋯, Bo's does not
  let p = await L.open(b, '#/waste', { who: 'ann', extra, wait: 1600 });
  ok(!!(await more(p, 'a1')) && !(await more(p, 'b1')), 'staff: the ⋯ on my own wastage line only');
  await openMenu(p, 'a1');
  ok(/Change amount/.test(await txt(p, '#lm-sheet') || '') && /2 kg/.test(await txt(p, '#lm-sheet .lm-fix') || '') && !/Remove/.test(await txt(p, '#lm-sheet') || ''), 'staff: Change amount, showing 2 kg; no Remove');
  await p.click('#lm-sheet [data-lm="qty"]'); await L.settle(p, 150);
  ok(await p.inputValue('#lm-v') === '2' && await p.getAttribute('#lm-sheet [data-lm="unit"][data-v="kg"]', 'aria-checked') === 'true', 'the form: the amount and its unit, ready to change');
  await p.fill('#lm-v', '1.5'); await p.press('#lm-v', 'Enter'); await L.settle(p, 500);
  let w = (await store(p))[root + 'waste/' + today + '/lines/a1'];
  ok(w.amount === 1.5 && w.unit === 'kg' && w.was && w.was.amount === 2 && w.was.unit === 'kg' && w.chgBy === 'Ann' && typeof w.chgAt === 'number', 'Save: 1.5 kg, the amount before kept as was, who and when (' + JSON.stringify({ a: w.amount, was: w.was, by: w.chgBy }) + ')');
  ok(/Amount changed to 1\.5 kg/.test(await txt(p, '.p-toast') || '') && /1\.5 kg/.test(await txt(p, '.nb-row[data-ln$="/a1"]') || ''), 'a toast says so, and the line shows 1.5 kg');
  await p.click('.p-toast-btn'); await L.settle(p, 500);
  w = (await store(p))[root + 'waste/' + today + '/lines/a1'];
  ok(w.amount === 2 && w.unit === 'kg' && w.was.amount === 1.5, 'Undo: back to 2 kg, the history says it was 1.5');
  // a different unit, and a big one asks first
  await openMenu(p, 'a1'); await p.click('#lm-sheet [data-lm="qty"]'); await L.settle(p, 150);
  await p.fill('#lm-v', '500'); await p.click('#lm-sheet [data-lm="unit"][data-v="kg"]');
  await p.press('#lm-v', 'Enter'); await L.settle(p, 300);
  ok((await store(p))[root + 'waste/' + today + '/lines/a1'].amount === 2 && /500 kg\? Check the unit/.test(await txt(p, '.p-toast') || ''), '500 kg asks first and saves nothing');
  await p.click('#lm-sheet [data-lm="unit"][data-v="g"]'); await p.press('#lm-v', 'Enter'); await L.settle(p, 500);
  w = (await store(p))[root + 'waste/' + today + '/lines/a1'];
  ok(w.amount === 500 && w.unit === 'g', 'a unit chip: 500 g saves');
  ok(!(await L.overflow(p)) && p.errors.length === 0, 'staff wastage: no sideways scroll, no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Sam (sous chef): Bo's line too
  p = await L.open(b, '#/waste', { who: 'sam', extra, wait: 1600 });
  ok(!!(await more(p, 'b1')), 'sous chef: the ⋯ on someone else\'s line');
  await openMenu(p, 'b1'); await p.click('#lm-sheet [data-lm="qty"]'); await L.settle(p, 150);
  await p.fill('#lm-v', '0.5'); await p.press('#lm-v', 'Enter'); await L.settle(p, 500);
  w = (await store(p))[root + 'waste/' + today + '/lines/b1'];
  ok(w.amount === 0.5 && w.was.amount === 1 && w.chgBy === 'Sam', 'sous chef: changes Bo\'s line, Sam recorded');
  await p.context().close();

  // Transfers: Sam changes an open loan, its open copy changes with it; a returned line has no Change amount
  p = await L.open(b, '#/transfers', { who: 'sam', extra, wait: 1600 });
  ok(!!(await more(p, 't1')), 'transfers: the ⋯ on an open loan');
  await openMenu(p, 't1'); await p.click('#lm-sheet [data-lm="qty"]'); await L.settle(p, 150);
  ok(await p.$$eval('#lm-sheet [data-lm="unit"]', l => l.map(e => e.textContent).join(',')) === 'g,kg,L,pieces,packs,boxes', 'transfers: the transfer units');
  await p.fill('#lm-v', '3'); await p.press('#lm-v', 'Enter'); await L.settle(p, 500);
  const s = await store(p), line = s[root + 'transfers/' + today + '/lines/t1'], open = s[root + 'transferOpen/' + today + '_t1'];
  ok(line.amount === 3 && line.was.amount === 2 && open.record.amount === 3 && open.record.was.amount === 2 && open.open === true, 'transfers: 3 kg saved, and the open loan list changes in the same write');
  ok(!(await more(p, 't2')) || !(await p.evaluate(() => { const b = document.querySelector('.nb-row[data-ln$="/t2"] .nb-more'); return b && b.classList.contains('nb-more-fix'); })), 'transfers: a returned line has no Change amount');
  ok(p.errors.length === 0, 'transfers: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the head chef's Google device on a phone: the ⋯ holds Change amount and Remove together ("both", 4 Nov 2026)
  p = await L.open(b, '#/waste', { admin: true, extra, wait: 1600 });
  await openMenu(p, 'b1');
  ok(/Change amount/.test(await txt(p, '#lm-sheet') || '') && !!(await p.$('#lm-sheet .lm-act')) && /Remove/.test(await txt(p, '#lm-sheet .lm-act') || ''), 'head chef: Change amount and Remove in one ⋯');
  await p.click('#lm-sheet .lm-act'); await L.settle(p, 500);
  ok((await store(p))[root + 'waste/' + today + '/lines/b1'].deleted === true && /Removed Rice/.test(await txt(p, '.p-toast') || ''), 'head chef: Remove from the ⋯ removes the line, with Undo');
  ok(p.errors.length === 0, 'head chef: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a laptop: the ⋯ shows where there is an amount to change, and the sheet fits
  p = await L.open(b, '#/waste', { who: 'ann', extra, width: 1280, height: 900, wait: 1600 });
  ok(await p.evaluate(() => { const m = document.querySelector('.nb-row[data-ln$="/a1"] .nb-more'); return !!m && m.getClientRects().length > 0; }), '1280 px: the ⋯ shows on my own line');
  await openMenu(p, 'a1');
  ok(await p.evaluate(() => { const s = document.querySelector('#lm-sheet .sheet').getBoundingClientRect(); return s.top >= 0 && s.bottom <= innerHeight + 1; }) && !(await L.overflow(p)), '1280 px: the sheet fits, no sideways scroll');
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
