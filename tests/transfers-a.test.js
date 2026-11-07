// Transfers, Clean notebook (3 Nov 2026, work pages redesign A, docs/work-pages-design-options/brief.md): Still out
// comes first, earlier days with how long each has been out (the age tag, a piece of B, darker from 7 days), then
// today's; then Done today. Since the redesign's step 4 (8 Nov 2026) each loan is a card that says who has it, since when
// and how long (red from 7 days), with Mark returned on the right of each item. Log a transfer opens a sheet that takes a whole
// pick-up: Add another item lists it, and Log the pick-up saves every item as its own line, with one Undo.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const today = L.ymd(new Date(L.NOW)), root = 'kitchens/' + L.PIN + '/';
const store = p => p.evaluate(() => window.__fake.dump());
const extra = {};
for (const [d, id, t, a, u, v, pn] of [[3, 'l1', 'Butter', 2, 'kg', 'Riviera', 'Jo'], [9, 'l2', 'Cream', 4, 'L', 'Grand Hotel', 'Lee']]) {
  const date = L.ymd(new Date(L.NOW - d * 86400000));
  const record = { dir: 'out', venue: v, person: pn, text: t, amount: a, unit: u, note: '', addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - d * 86400000, deleted: false, by: 'bo' };
  extra[root + 'transfers/' + date + '/lines/' + id] = record;
  extra[root + 'transferOpen/' + date + '_' + id] = { date, lineId: id, record, open: true };
}
extra[root + 'transfers/' + today + '/lines/t1'] = { dir: 'out', venue: 'Riviera', person: 'Jess', text: 'Brioche buns', amount: 2, unit: 'packs', note: '', addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - 1800000, deleted: false, by: 'bo' };
extra[root + 'transfers/' + today + '/lines/t2'] = { dir: 'in', venue: 'Grand Hotel', person: 'Lee', text: 'Lemons', amount: 12, unit: 'pieces', note: '', addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 1200000, deleted: false, returned: true, returnedBy: 'Ann', returnedById: 'ann', returnedAt: L.NOW - 600000, by: 'ann' };
const lines = async (p, text) => Object.entries(await store(p)).filter(([k, v]) => k.indexOf(root + 'transfers/' + today + '/lines/') === 0 && v.text === text);
(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/transfers', { who: 'sam', extra, wait: 1600 });
  await L.waitFor(p, () => document.querySelectorAll('.tr-outstanding .tr-row').length === 3, null, 6000).catch(() => {});

  // Still out first: the earlier days with their age, then today's; the returned line under Done today
  const out = await p.$$eval('.tr-outstanding .tr-card', l => l.map(c => c.querySelector('.tr-cv').textContent + ': ' + [...c.querySelectorAll('.tr-row strong')].map(e => e.textContent).join(', ') + ' ' + c.querySelector('.tr-age').textContent + (c.classList.contains('is-old') && c.querySelector('.tr-age.is-old') ? '!' : '')));
  ok(out.join(' | ') === 'Lent to Grand Hotel: Cream 9 days! | Lent to Riviera: Butter 3 days | Lent to Riviera: Brioche buns Today', 'Still out: a card a loan, earlier days with their age (red from 7 days), then today\'s (' + out.join(' | ') + ')');
  const sub = await txt(p, '.tr-card:nth-child(2) .tr-cs') || '';
  ok(/Jo came for it · logged by Bo$/.test(sub.trim()), 'a card says since when, who came for it and who logged it (' + sub + ')');
  ok(/Lemons/.test(await txt(p, '.tr-done') || '') && !/Lemons/.test(await txt(p, '.tr-outstanding') || ''), 'Done today: the returned line, and only there');
  const order = await p.evaluate(() => ['.tr-outstanding', '.tr-done'].map(s => Math.round(document.querySelector(s).getBoundingClientRect().top)));
  ok(order[0] < order[1] && await L.docked(p, '.tr-logbtn'), 'page: Still out, then Done today, with Log a transfer docked above the tab bar (' + order.join(', ') + ')');
  ok(await p.evaluate(() => [...document.querySelectorAll('.tr-outstanding .tr-row')].every(r => { const t = r.querySelector('.tr-ret'), w = r.querySelector('.nb-t'), b = t && t.getBoundingClientRect(); return t && /Mark returned/.test(t.textContent) && b.left >= w.getBoundingClientRect().right - 1 && b.height >= 44; })), 'Still out: each item has Mark returned on its right, in words, at least 44 px');
  ok(!(await p.$('#tr-text')), 'page: no form until Log a transfer');

  // a pick-up of two items, one taken out again, then Log the pick-up
  await p.click('[data-p="tr-log"]'); await L.settle(p, 250);
  ok(await p.evaluate(() => !!document.querySelector('.tr-sheet[role="dialog"]') && !!document.querySelector('.sheet-bg') && document.activeElement && document.activeElement.id === 'tr-venue'), 'Log a transfer: a sheet over a dimmed page, the cursor on the venue');
  await p.fill('#tr-venue', 'Riviera'); await p.fill('#tr-person', 'Tom');
  await p.click('[data-p="tr-note-open"]'); await p.fill('#tr-note', 'Back Friday');
  for (const [t, a] of [['Limes', '6'], ['Mint', '2'], ['Flour', '5']]) {
    await p.fill('#tr-text', t); await p.fill('#tr-amt', a); await p.click('[data-p="tr-unit"][data-v="kg"]');
    await p.click('[data-p="tr-bk-add"]'); await L.settle(p, 200);
  }
  const bk = await p.$$eval('.tr-basket li', l => l.map(e => e.firstChild.textContent));
  ok(bk.join(' | ') === 'Limes 6 kg | Mint 2 kg | Flour 5 kg' && await p.inputValue('#tr-text') === '' && await p.inputValue('#tr-venue') === 'Riviera', 'Add another item: the pick-up lists each item and empties the item boxes (' + bk.join(' | ') + ')');
  ok(/Log the pick-up/.test(await txt(p, '.tr-add .nb-addbtn') || ''), 'the button says Log the pick-up');
  await p.click('.tr-basket [data-p="tr-bk-del"][data-i="1"]'); await L.settle(p, 150);
  ok((await p.$$('.tr-basket li')).length === 2 && !/Mint/.test(await txt(p, '.tr-basket') || ''), 'Take out takes Mint out of the pick-up');
  await p.click('.tr-add .nb-addbtn'); await L.settle(p, 500);
  const limes = await lines(p, 'Limes'), flour = await lines(p, 'Flour');
  ok(limes.length === 1 && flour.length === 1 && [limes[0][1], flour[0][1]].every(x => x.venue === 'Riviera' && x.person === 'Tom' && x.note === 'Back Friday' && x.dir === 'out' && x.unit === 'kg' && !x.deleted) && !(await lines(p, 'Mint')).length, 'Log the pick-up: Limes and Flour saved as their own lines, with the venue, the person and the note');
  // one receipt line in the open sheet for the pick-up (step 2b, 5 Nov 2026), read out as it was said on the slip
  ok((await p.$$('.tr-sheet .just-l')).length === 1 && /^2 items to Riviera$/.test(await txt(p, '.tr-sheet .just-l .just-n') || '') && /Riviera took 2 items/.test(await p.evaluate(() => (document.getElementById('lk-live') || {}).textContent || '')) && !(await p.$('.tr-basket')) && await p.inputValue('#tr-venue') === 'Riviera', 'one receipt line for the pick-up; the list is empty, the venue stays for the next one (' + await txt(p, '.tr-sheet .just-r') + ')');
  await p.click('.tr-sheet [data-p="just-undo"]'); await L.settle(p, 500);
  ok((await lines(p, 'Limes'))[0][1].deleted === true && (await lines(p, 'Flour'))[0][1].deleted === true, 'Undo takes both lines back');

  // a single item still logs as before
  await p.fill('#tr-text', 'Eggs'); await p.fill('#tr-amt', '30'); await p.click('[data-p="tr-unit"][data-v="pieces"]');
  await p.click('.tr-add .nb-addbtn'); await L.settle(p, 500);
  // the sheet's receipt names it and the words are read out (step 2b, 5 Nov 2026)
  ok((await lines(p, 'Eggs')).length === 1 && /^Eggs 30 pieces, to Riviera$/.test(await txt(p, '.tr-sheet .just-l:last-child .just-n') || '') && /Riviera took 30 pieces Eggs/.test(await p.evaluate(() => (document.getElementById('lk-live') || {}).textContent || '')), 'one item: Log it saves it, the sheet says what');
  await p.keyboard.press('Escape'); await L.settle(p, 200);
  ok(!(await p.$('.tr-sheet')) && await p.evaluate(() => document.activeElement && document.activeElement.classList.contains('tr-logbtn')), 'Escape closes the sheet, back on Log a transfer');
  ok(/Eggs/.test(await txt(p, '.tr-outstanding') || ''), 'the new line is under Still out');
  ok(!(await L.overflow(p)) && p.errors.length === 0, 'phone: no sideways scroll, no page errors ' + p.errors.join(' | '));
  await p.context().close();

  for (const [w, h] of [[768, 1024], [1280, 900]]) {
    p = await L.open(b, '#/transfers', { who: 'sam', extra, width: w, height: h, wait: 1600 });
    const page = !(await L.overflow(p));
    await L.xLog(p);
    const fits = await p.evaluate(() => { const s = document.querySelector('.tr-sheet').getBoundingClientRect(); return s.left >= 0 && s.right <= innerWidth && s.top >= 0 && s.bottom <= innerHeight; });
    ok(page && fits && !(await L.overflow(p)), w + ' px: the page and the sheet fit, no sideways scroll');
    ok(p.errors.length === 0, w + ' px: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
