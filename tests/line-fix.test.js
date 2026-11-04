// Fix a line (3 Nov 2026, work pages redesign S5): Change amount, and on the prep list Move to section, in the line's ⋯
// menu, for anyone ticked for Add, on today's open lines that are not a function's. Before, a wrong amount meant Remove
// and writing the line again. One update through W(), with Undo; an unchanged value saves nothing.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const today = L.ymd(new Date(L.NOW));
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const doc = (p, path) => p.evaluate(k => window.__fake.dump()[k] || null, fsKey(path));
const writes = p => p.evaluate(() => window.__fake.writes.length);
const extra = {};
extra[fsKey(['days', today, 'items', 'fn1'])] = { text: 'Arancini platter', station: 'Functions', qty: '40', recipe: '', fn: 'f1', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 3600000, done: false, deleted: false };
async function openMenu(p, sel) { await p.click(sel + ' .nb-more'); await L.settle(p, 200); }
(async () => {
  const b = await L.start();

  // staff on a phone: the ⋯ now shows for Add, with the line's amount and section under each action
  let p = await L.open(b, '#/prep', { who: 'ann', extra, wait: 1600 });
  ok(await p.$eval('#nbr-i1 .nb-more', e => e.classList.contains('nb-more-fix') && getComputedStyle(e).display !== 'none'), 'staff: the line ⋯ shows for someone ticked for Add');
  await openMenu(p, '#nbr-i1');
  const acts = await p.evaluate(() => [...document.querySelectorAll('#lm-sheet .lm-fix')].map(e => [...e.children].map(c => c.textContent.trim()).join(' ')));
  ok(acts.join(' | ') === 'Change amount 2 tubs | Move to section Larder', 'staff: Change amount and Move to section, with what the line has now (' + acts.join(' | ') + ')');
  ok(!(await p.$('#lm-sheet .lm-act')), 'staff: no Remove in the menu (staff cannot remove)');

  // Change amount: the box starts on the amount, Save writes the new one with Undo
  await p.click('#lm-sheet [data-lm="qty"]'); await L.settle(p, 150);
  ok(await p.inputValue('#lm-v') === '2 tubs' && await p.evaluate(() => document.activeElement && document.activeElement.id === 'lm-v'), 'amount: the box starts on 2 tubs and has the cursor');
  await p.fill('#lm-v', '3 tubs'); await p.press('#lm-v', 'Enter'); await L.settle(p, 300);
  let it = await doc(p, ['days', today, 'items', 'i1']);
  ok(it.qty === '3 tubs' && it.qn === 3 && it.text === 'Slice onions' && it.station === 'Larder' && it.by === 'ann', 'amount: saved as 3 tubs, read as 3, nothing else changed (' + JSON.stringify({ qty: it.qty, qn: it.qn, by: it.by }) + ')');
  ok(!(await p.$('#lm-sheet')) && /Amount changed to 3 tubs/.test(await txt(p, '.p-toast') || ''), 'amount: the sheet closes and a toast says so, with Undo');
  ok(/3 tubs/.test(await txt(p, '#nbr-i1') || ''), 'amount: the line shows 3 tubs');
  await p.click('.p-toast-btn'); await L.settle(p, 300);
  it = await doc(p, ['days', today, 'items', 'i1']);
  ok(it.qty === '2 tubs', 'amount: Undo puts 2 tubs back');

  // nothing changed, nothing saved
  const before = await writes(p);
  await openMenu(p, '#nbr-i1'); await p.click('#lm-sheet [data-lm="qty"]'); await L.settle(p, 150);
  await p.click('#lm-sheet .lm-form button[type="submit"]'); await L.settle(p, 300);
  ok(await writes(p) === before && !(await p.$('#lm-sheet')), 'amount: Save with the same amount closes and writes nothing');

  // Move to section: a chip moves the line at once, with Undo
  await openMenu(p, '#nbr-i1'); await p.click('#lm-sheet [data-lm="sec"]'); await L.settle(p, 150);
  const secs = await p.evaluate(() => [...document.querySelectorAll('#lm-sheet [data-lm="pick"]')].map(e => e.textContent + (e.getAttribute('aria-pressed') === 'true' ? '*' : '')));
  ok(secs.includes('Larder*') && secs.includes('Sauce'), 'section: the kitchen sections, Larder lit (' + secs.join(', ') + ')');
  await p.click('#lm-sheet [data-lm="pick"][data-v="Sauce"]'); await L.settle(p, 300);
  it = await doc(p, ['days', today, 'items', 'i1']);
  ok(it.station === 'Sauce' && it.qty === '2 tubs' && /Moved to Sauce/.test(await txt(p, '.p-toast') || ''), 'section: Slice onions moves to Sauce, and a toast says so');
  await p.click('.p-toast-btn'); await L.settle(p, 300);
  ok((await doc(p, ['days', today, 'items', 'i1'])).station === 'Larder', 'section: Undo moves it back to Larder');

  // Escape closes the form without saving
  await openMenu(p, '#nbr-i1'); await p.click('#lm-sheet [data-lm="qty"]'); await L.settle(p, 150);
  await p.fill('#lm-v', '9 tubs'); await p.keyboard.press('Escape'); await L.settle(p, 200);
  ok(!(await p.$('#lm-sheet')) && (await doc(p, ['days', today, 'items', 'i1'])).qty === '2 tubs', 'Escape closes the form and saves nothing');

  // a ticked line keeps its ⋯, so the row keeps its shape (a tick moves no row, 20 Oct 2026); the sheet then says who
  // prepared it, with nothing to change
  const h0 = await p.$eval('#nbr-i1', e => Math.round(e.getBoundingClientRect().height));
  await p.click('#nbr-i1 .nb-box'); await L.settle(p, 400);
  ok(await p.$eval('#nbr-i1', e => e.classList.contains('is-done')) && await p.$eval('#nbr-i1 .nb-more', e => getComputedStyle(e).display !== 'none'), 'ticked: the line keeps its ⋯');
  ok(await p.$eval('#nbr-i1', e => Math.round(e.getBoundingClientRect().height)) === h0, 'ticked: the row keeps its height (' + h0 + ' px)');
  await openMenu(p, '#nbr-i1');
  ok(!(await p.$('#lm-sheet .lm-fix')) && /prepared by Ann/.test(await txt(p, '#lm-sheet .lm-who') || ''), 'ticked: the sheet says who prepared it, with no Change amount (' + await txt(p, '#lm-sheet .lm-who') + ')');
  await p.keyboard.press('Escape'); await L.settle(p, 150);

  // a function's line keeps its numbers: no ⋯ for staff
  ok(!(await p.$('#nbr-fn1 .nb-more')), 'a function line has no Change amount');
  ok(!(await L.overflow(p)) && p.errors.length === 0, 'staff phone: no sideways scroll, no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // an order line: Change amount, no section
  p = await L.open(b, '#/orders', { who: 'ann', wait: 1600 });
  const orow = '.nb-row[data-ln="' + today + '/o1"]';
  await openMenu(p, orow);
  ok((await p.$$('#lm-sheet [data-lm="qty"]')).length === 1 && !(await p.$('#lm-sheet [data-lm="sec"]')), 'order: Change amount only');
  await p.click('#lm-sheet [data-lm="qty"]'); await L.settle(p, 150);
  await p.fill('#lm-v', '8 L'); await p.press('#lm-v', 'Enter'); await L.settle(p, 300);
  const ol = await doc(p, ['orders', today, 'lines', 'o1']);
  ok(ol.qty === '8 L' && ol.text === 'Milk' && ol.by === 'ann', 'order: Milk is now 8 L (' + ol.qty + ')');
  ok(p.errors.length === 0, 'order: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a laptop: the ⋯ shows for the fix, and a sous chef keeps Remove in the line
  p = await L.open(b, '#/prep', { who: 'sam', width: 1280, height: 900, wait: 1600 });
  ok(await p.$eval('#nbr-i1 .nb-more', e => getComputedStyle(e).display !== 'none') && await p.$eval('#nbr-i1 .nb-x', e => getComputedStyle(e).display !== 'none'), 'laptop: the ⋯ shows for Change amount, and Remove stays in the line');
  await openMenu(p, '#nbr-i1');
  ok((await p.$$('#lm-sheet .lm-fix')).length === 2 && !!(await p.$('#lm-sheet .lm-act')), 'laptop, sous chef: Change amount, Move to section and Remove line');
  await p.keyboard.press('Escape'); await L.settle(p, 150);
  ok(!(await L.overflow(p)) && p.errors.length === 0, 'laptop: no sideways scroll, no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
