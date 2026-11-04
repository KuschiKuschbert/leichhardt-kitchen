// One line layout (S4 of the work pages redesign, 4 Nov 2026, as drawn in the agreed design): on Prep, Orders, Wastage
// and Transfers the words and amount, then a small second line with who and when (the section on Wastage, the venue on
// Transfers), the ⋯ on the right. The second line is always there, so ticking a line never changes its height.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const root = 'kitchens/' + L.PIN + '/', today = L.ymd(new Date(L.NOW));
const extra = {};
extra[root + 'days/' + today + '/items/s4p'] = { text: 'Dice carrot', qty: '2 kg', station: 'Larder', recipe: '', addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 600000, done: false, deleted: false };
extra[root + 'orders/' + today + '/lines/s4o'] = { text: 'Lemons', qty: '2 kg', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 600000, ordered: false, deleted: false };
extra[root + 'waste/' + today + '/lines/s4w'] = { text: 'Chips', amount: 2, unit: 'kg', reason: 'excess', action: '', station: 'Fryer', addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 1800000, deleted: false };
const xr = { dir: 'out', venue: 'Riviera', person: 'Jo', text: 'Butter', amount: 2, unit: 'kg', note: '', addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - 1200000, deleted: false, by: 'bo' };
extra[root + 'transfers/' + today + '/lines/s4x'] = xr;
extra[root + 'transferOpen/' + today + '_s4x'] = { date: today, lineId: 's4x', record: xr, open: true, by: 'bo' };
const row = id => '.nb-row[data-ln$="/' + id + '"]';
// the second line: its words, whether it sits under the words (not beside them), and the row's height
const meta = (p, id) => p.evaluate(sel => {
  const r = document.querySelector(sel), m = r && r.querySelector('.nb-meta'), t = r && r.querySelector('.nb-t');
  if (!m || !t) return null;
  const mb = m.getBoundingClientRect(), tb = t.getBoundingClientRect();
  return { text: m.textContent.trim(), under: mb.top >= tb.bottom - 1 && Math.abs(mb.left - tb.left) < 2, shown: mb.height > 0 && getComputedStyle(m).visibility !== 'hidden', height: r.getBoundingClientRect().height };
}, row(id));
(async () => {
  const b = await L.start();

  for (const w of [390, 1280]) {
    let p = await L.open(b, '#/prep', { who: 'sam', extra, width: w, height: w === 390 ? 844 : 900, wait: 1600 });
    let m = await meta(p, 's4p');
    ok(!!m && /^Ann \d\d:\d\d$/.test(m.text) && m.under && m.shown, w + ' px prep: "Ann 08:10" on a small line under the words (' + JSON.stringify(m) + ')');
    if (w === 390) {
      const before = m.height;
      await L.tap(p, '[data-p="tick"][data-id="s4p"]'); await L.settle(p, 500);
      m = await meta(p, 's4p');
      ok(!!m && /^Sam \d\d:\d\d$/.test(m.text) && Math.abs(m.height - before) < 1, 'prep: ticked, the second line says who prepared it and the row keeps its height (' + before + ' to ' + (m && m.height) + ')');
    }
    ok(p.errors.length === 0 && !(await L.overflow(p)), w + ' px prep: no page errors, no sideways scroll ' + p.errors.join(' | '));
    await p.context().close();

    p = await L.open(b, '#/orders', { who: 'sam', extra, width: w, height: w === 390 ? 844 : 900, wait: 1600 });
    m = await meta(p, 's4o');
    ok(!!m && /^Ann \d\d:\d\d$/.test(m.text) && m.under && m.shown, w + ' px orders: who and when under the words (' + JSON.stringify(m) + ')');
    if (w === 390) {
      const before = m.height;
      await p.click('[data-p="otick"][data-id="s4o"]'); await L.settle(p, 500);
      m = await meta(p, 's4o');
      ok(!!m && /^Ordered by Sam \d\d:\d\d$/.test(m.text) && Math.abs(m.height - before) < 1, 'orders: ticked ordered, "Ordered by Sam 13:20" and the row keeps its height (' + (m && m.text) + ')');
    }
    await p.context().close();

    p = await L.open(b, '#/waste', { who: 'sam', extra, width: w, height: w === 390 ? 844 : 900, wait: 1600 });
    m = await meta(p, 's4w');
    ok(!!m && m.text === 'Fryer · Ann' && m.under && m.shown && /^\d\d:\d\d$/.test((await txt(p, row('s4w') + ' .w-time') || '').trim()), w + ' px wastage: "Fryer · Ann" under the words, the time on the left (' + JSON.stringify(m) + ')');
    await p.context().close();

    p = await L.open(b, '#/transfers', { who: 'sam', extra, width: w, height: w === 390 ? 844 : 900, wait: 1600 });
    m = await meta(p, 's4x');
    ok(!!m && m.text === 'To Riviera, Jo came for it · logged by Bo' && m.under && m.shown, w + ' px transfers: the venue, who came and who logged it under the words (' + JSON.stringify(m) + ')');
    if (w === 390) {
      await p.click(row('s4x') + ' .nb-more'); await L.settle(p, 200);
      ok(/Written by Bo/.test(await txt(p, '#lm-sheet .lm-who') || ''), 'transfers: the ⋯ sheet still says who wrote it');
    }
    ok(p.errors.length === 0 && !(await L.overflow(p)), w + ' px transfers: no page errors, no sideways scroll ' + p.errors.join(' | '));
    await p.context().close();
  }

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
