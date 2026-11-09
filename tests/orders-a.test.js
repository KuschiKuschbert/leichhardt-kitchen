// Orders: staff see one request list without waiting ages. Chefs retain source dates, the date picker and Delivery
// received. Ordered today stays folded under its count; Add request opens the existing sheet.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const today = L.ymd(new Date(L.NOW)), back = n => L.ymd(new Date(L.NOW - n * 86400000));
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const store = p => p.evaluate(() => window.__fake.dump());
const lines = async (p, text) => Object.entries(await store(p)).filter(([k, v]) => k.indexOf(fsKey(['orders', today, 'lines'])) === 0 && v.text === text);
const extra = {};
extra[fsKey(['orders', today, 'lines', 'r-f1'])] = { text: 'Flour', qty: '2 bags', recipes: [], addedBy: 'Rolled over', addedById: '', addedAt: L.NOW - 7200000, rolled: 2, root: 'f1', from: 'f1', rolledFrom: back(1), since: back(2), origBy: 'Ann', ordered: false, deleted: false };
(async () => {
  const b = await L.start();

  // Staff on a phone: one list, including carried requests, without ages or creation times.
  let p = await L.open(b, '#/orders', { who: 'ann', extra, wait: 1600 });
  ok(!(await p.$('#o-text')) && !(await p.$('[data-p="oview"]')), 'staff: no add form on the page and no By day or Everything to order');
  const order = await p.evaluate(() => ({ rows: [...document.querySelectorAll('.o-main .nb-row')].map(r => r.querySelector('.nb-t').textContent), lists: document.querySelectorAll('.o-main > .nb-rows').length, age: !!document.querySelector('.o-main .nb-roll, .o-wait, #o-overdue') }));
  ok(order.lists === 1 && order.rows.length === 3 && /^Flour/.test(order.rows[0]) && order.rows.some(t => /^Milk/.test(t)) && !order.age, 'staff: every request stays in one creation-ordered list without age sections or badges (' + JSON.stringify(order) + ')');
  ok((await txt(p, '.o-main [data-ln$="/o1"] .nb-wrote')).trim() === 'Ann', 'staff: the request author remains without the creation clock');
  await p.click('.o-main [data-ln$="/r-f1"] [data-lm="open"]'); await L.settle(p, 150);
  ok((await txt(p, '#lm-h')).trim() === 'Flour 2 bags' && (await txt(p, '#lm-sheet .lm-who')).trim() === 'from Ann', 'staff: More keeps the request, amount and author without age in its accessible heading');
  await p.keyboard.press('Escape'); await L.settle(p, 150);
  await p.evaluate(([key, at]) => window.__fake.write(key, Object.assign({}, window.__fake.dump()[key], { ordered: true, orderedBy: 'Sam', orderedAt: at })), [fsKey(['orders', today, 'lines', 'o1']), L.NOW - 60000]);
  await L.waitFor(p, () => /Ordered by Sam 13:59/.test(document.querySelector('.o-main [data-ln$="/o1"] .nb-wrote').textContent), null, 6000);
  ok(/Ordered by Sam 13:59/.test(await txt(p, '.o-main [data-ln$="/o1"] .nb-wrote')), 'staff: a chef completion still shows who ordered it and the completion time');
  const btn = await p.evaluate(() => { const b = document.querySelector('.o-page .nb-addline').getBoundingClientRect(), t = document.querySelector('.tabbar').getBoundingClientRect(); return b.bottom <= t.top && b.height >= 48; });
  ok(btn, 'staff phone: Add request floats above the tab bar');
  await p.click('[data-p="o-write"]'); await L.settle(p, 250);
  ok(await p.evaluate(() => !!document.querySelector('.o-sheet[role="dialog"]') && document.activeElement && document.activeElement.id === 'o-text'), 'Add request: a sheet, the cursor in the box');
  await p.fill('#o-text', 'Lemons'); await p.fill('#o-qty', '2 kg'); await p.press('#o-text', 'Enter'); await L.settle(p, 500);
  ok((await lines(p, 'Lemons')).length === 1 && !!(await p.$('.o-sheet')) && await p.inputValue('#o-text') === '', 'Add saves the line, the sheet stays for the next one');
  await p.keyboard.press('Escape'); await L.settle(p, 200);
  ok(!(await p.$('.o-sheet')) && /Lemons/.test(await txt(p, '.o-main') || ''), 'Escape closes it; Lemons is on the list');
  ok(!(await p.$('#o-day')) && !(await p.$('.o-deliv')), 'staff: no date chip and no Delivery received');
  ok(!(await L.overflow(p)) && p.errors.length === 0, 'staff phone: no sideways scroll, no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a sous chef: the date chip and Delivery received; Ordered today folded
  p = await L.open(b, '#/orders', { who: 'sam', extra, wait: 1600 });
  ok(await p.inputValue('#o-day') === today && await p.getAttribute('.o-deliv', 'href') === '#/deliveries', 'chef: a date chip on today, and Delivery received links to its page');
  await p.click('.o-main .nb-row .nb-box'); await L.settle(p, 300);
  await p.clock.runFor(11 * 60000); await L.settle(p, 600);
  ok(await p.evaluate(() => { const d = document.querySelector('.o-done'); return !!d && !d.open && /Ordered today \(1\)/.test(d.querySelector('summary').textContent); }), 'Ordered today is folded under its count');
  await p.click('.o-done summary'); await L.settle(p, 200);
  ok(await p.evaluate(() => document.querySelector('.o-done').open && document.querySelectorAll('.o-done .nb-done li').length === 1), 'a tap opens it');
  await p.fill('#o-day', back(1)); await L.settle(p, 600);
  ok(/Back to today/.test(await txt(p, '.o-nav') || '') && !(await p.$('.o-deliv')) && !(await p.$('[data-p="o-write"]')), 'chef: another day from the date chip, with Back to today and no Add request');
  await p.click('.o-nav [data-p="otoday"]'); await L.settle(p, 500);
  ok(await p.inputValue('#o-day') === today && !!(await p.$('.o-deliv')), 'Back to today');
  ok(!(await L.overflow(p)) && p.errors.length === 0, 'chef phone: no sideways scroll, no page errors ' + p.errors.join(' | '));
  await p.context().close();

  for (const [w, h] of [[768, 1024], [1280, 900]]) {
    p = await L.open(b, '#/orders', { who: 'sam', extra, width: w, height: h, wait: 1600 });
    const page = !(await L.overflow(p));
    await L.oLog(p);
    const fits = await p.evaluate(() => { const s = document.querySelector('.o-sheet').getBoundingClientRect(); return s.left >= 0 && s.right <= innerWidth && s.top >= 0 && s.bottom <= innerHeight; });
    ok(page && fits && !(await L.overflow(p)), w + ' px: the page and the sheet fit, no sideways scroll');
    ok(p.errors.length === 0, w + ' px: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
