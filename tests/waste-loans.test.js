// Wastage and Transfers in the redesign (step 4, 8 Nov 2026, head chef; docs/whole-app-redesign-options/brief.md, Build
// step 4; every-page.html e-waste and e-transfers). Wastage: the reason leads each entry's second line with a dot in the
// colour of today's bar, Make it again is its own button (on the right from 480 px, under the second line on a phone),
// and the sections the waste came from sit under the count, in the header's own height. Transfers: Still out is a card a
// pick-up (the lines one person logged together for one venue), saying who has it, since when and how long, red from 7
// days, with Mark returned on each item and Undo on the slip. Neither reads anything of its own.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const today = L.ymd(new Date(L.NOW)), root = 'kitchens/' + L.PIN + '/';
const ago = d => L.ymd(new Date(L.NOW - d * 86400000));
const store = p => p.evaluate(() => window.__fake.dump());
const extra = {};
// the seed has Chips, excess, Fryer, at 30 minutes ago
const waste = (id, text, amount, unit, reason, station, by, byId, mins) => { extra[root + 'waste/' + today + '/lines/' + id] = { text, amount, unit, reason, action: '', station, addedBy: by, addedById: byId, addedAt: L.NOW - mins * 60000, deleted: false }; };
waste('w2', 'Bread rolls', 12, 'each', 'expired', 'Pastry', 'Ann', 'ann', 170);
waste('w3', 'Cream', 1, 'L', 'fault', 'Larder', 'Ann', 'ann', 260);
waste('w4', 'Onion offcuts', 0.5, 'kg', 'oops<b>x</b>', 'Larder', 'Bo', 'bo', 300);   // a reason the book does not know
// a pick-up of two items three days ago, a second pick-up for the same venue two hours later, and an old loan
const loan = (d, id, text, amount, unit, venue, person, dir, plus) => {
  const date = ago(d), record = { dir, venue, person, text, amount, unit, note: '', addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - d * 86400000 + plus, deleted: false, by: 'bo' };
  extra[root + 'transfers/' + date + '/lines/' + id] = record;
  extra[root + 'transferOpen/' + date + '_' + id] = { date, lineId: id, record, open: true };
};
loan(3, 'l1', 'Butter', 2, 'kg', 'Riviera', 'Jo', 'out', 0);
loan(3, 'l2', 'Cream', 2, 'L', 'Riviera', 'Jo', 'out', 1);
loan(3, 'l3', 'Limes', 6, 'pieces', 'Riviera', 'Jo', 'out', 7200000);
loan(9, 'l4', 'Fryer oil', 20, 'L', 'Grand Hotel', 'Lee', 'in', 0);
loan(0, 't1', 'Brioche buns', 2, 'packs', 'Riviera', 'Jess', 'out', -1800000);
const noSec = Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, /\/waste\//.test(k) ? Object.assign({}, v, { station: '' }) : v]));
noSec[root + 'waste/' + today + '/lines/w1'] = { text: 'Chips', amount: 2, unit: 'kg', reason: 'excess', action: '', station: '', addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - 1800000, deleted: false };
const headH = p => p.evaluate(() => Math.round(document.querySelector('.w-page .nb-ph').getBoundingClientRect().height));
(async () => {
  const b = await L.start();

  for (const w of [390, 768, 1280]) {
    // Wastage: the sections under the count, in the header's own height
    let p = await L.open(b, '#/waste', { who: 'sam', extra: noSec, width: w, height: 900, wait: 1600 });
    const plain = await headH(p);
    ok(!(await p.$('.w-secs')), w + ' px: no sections written, no sections line');
    await p.context().close();
    p = await L.open(b, '#/waste', { who: 'sam', extra, width: w, height: 900, wait: 1600 });
    ok(await txt(p, '.w-page .nb-ph .w-secs') === 'Larder, Pastry, Fryer' && /^4 entries$/.test((await txt(p, '.w-page .nb-ph .nb-prog') || '').trim()), w + ' px wastage: 4 entries, and under it the sections they came from (' + await txt(p, '.w-secs') + ')');
    ok(await headH(p) === plain, w + ' px wastage: the sections line keeps the header\'s height (' + plain + ' and ' + await headH(p) + ')');

    // the reason leads the second line, with the bar's colour; one the book does not know shows as written, with no colour
    const rs = await p.$$eval('.w-row', l => l.map(r => { const m = r.querySelector('.nb-meta'), t = m && m.firstElementChild; return { text: r.querySelector('strong').textContent, first: t && t.classList.contains('w-rs') ? t.textContent : '', dot: t && t.querySelector('.w-dot') ? [...t.querySelector('.w-dot').classList].filter(c => /^w-c-/.test(c)).join() : '', bold: !!(m && m.querySelector('b')) }; }));
    const one = t => rs.filter(x => x.text === t)[0] || {};
    ok(one('Cream').first === 'Cooking fault' && one('Cream').dot === 'w-c-fault' && one('Bread rolls').first === 'Expired stock' && one('Bread rolls').dot === 'w-c-expired', w + ' px wastage: the reason leads the second line, in the bar\'s colour (' + JSON.stringify(rs) + ')');
    ok(one('Onion offcuts').first === 'oops<b>x</b>' && !one('Onion offcuts').dot && !one('Onion offcuts').bold, w + ' px wastage: a reason the book does not know shows as written, with no colour and no markup');

    // Make it again: on the right of the words from 480 px; under the second line on a phone
    const ag = await p.evaluate(() => { const r = document.querySelector('.w-row[data-ln$="/w3"]'), a = r.querySelector('.w-again').getBoundingClientRect(), t = r.querySelector('.nb-t').getBoundingClientRect(), m = r.querySelector('.nb-meta').getBoundingClientRect(), n = r.querySelector('.nb-main').getBoundingClientRect(), row = r.getBoundingClientRect(); return { right: a.left >= t.right - 1 && a.top < m.bottom, under: a.top >= m.bottom - 1 && Math.abs(a.left - n.left) < 2 && a.bottom <= row.bottom + 1, h: a.height, metaFits: r.querySelector('.nb-meta').scrollWidth <= Math.ceil(m.width) + 1 }; });
    ok((w < 480 ? ag.under : ag.right) && ag.h >= 44 && ag.metaFits, w + ' px wastage: Make it again ' + (w < 480 ? 'under the second line' : 'on the right of the words') + ', 44 px, and the second line is whole (' + JSON.stringify(ag) + ')');
    ok(p.errors.length === 0 && !(await L.overflow(p)), w + ' px wastage: no page errors, no sideways scroll ' + p.errors.join(' | '));
    await p.context().close();

    // Transfers: a card a pick-up, the oldest first, red from 7 days
    p = await L.open(b, '#/transfers', { who: 'ann', extra, width: w, height: 900, wait: 1600 });
    await L.waitFor(p, () => document.querySelectorAll('.tr-outstanding .tr-card').length === 4, null, 6000).catch(() => {});
    const cards = await p.$$eval('.tr-outstanding .tr-card', l => l.map(c => c.querySelector('.tr-cv').textContent + ': ' + [...c.querySelectorAll('.tr-row strong')].map(e => e.textContent).join(', ') + ' · ' + c.querySelector('.tr-age').textContent + (c.classList.contains('is-old') ? ' · old' : '')));
    ok(cards.join(' | ') === 'Borrowed from Grand Hotel: Fryer oil · 9 days · old | Lent to Riviera: Butter, Cream · 3 days | Lent to Riviera: Limes · 3 days | Lent to Riviera: Brioche buns · Today', w + ' px transfers: one card a pick-up, the oldest first, red from 7 days (' + cards.join(' | ') + ')');
    ok(/Lee gave it · logged by Bo$/.test((await txt(p, '.tr-card.is-old .tr-cs') || '').trim()), w + ' px transfers: the card says who gave it and who logged it');
    ok(await p.$$eval('.tr-outstanding .tr-row', l => l.every(r => { const b = r.querySelector('.tr-ret'); return b && b.getBoundingClientRect().height >= 44 && /Mark returned/.test(b.textContent); })), w + ' px transfers: Mark returned on every item, in words, 44 px');
    ok(p.errors.length === 0 && !(await L.overflow(p)), w + ' px transfers: no page errors, no sideways scroll ' + p.errors.join(' | '));

    if (w === 390) {
      // a return is one item, all of it: Cream comes back, Butter stays out on its card; Undo puts Cream back
      await p.click('.tr-row[data-ln$="/l2"] [data-p="tr-return"]'); await L.settle(p, 500);
      let s = await store(p);
      ok(s[root + 'transfers/' + ago(3) + '/lines/l2'].returned === true && !s[root + 'transfers/' + ago(3) + '/lines/l1'].returned && /Lent to Riviera: Butter$/.test(await p.$eval('.tr-outstanding .tr-card:nth-child(2)', c => c.querySelector('.tr-cv').textContent + ': ' + [...c.querySelectorAll('.tr-row strong')].map(e => e.textContent).join(', '))), '390 px: Mark returned on Cream returns Cream only, Butter stays on its card');
      await p.click('.p-toast [data-p="toast-act"]'); await L.settle(p, 500);
      s = await store(p);
      ok(s[root + 'transfers/' + ago(3) + '/lines/l2'].returned === false && !!(await p.$('.tr-card .tr-row[data-ln$="/l2"]')), '390 px: Undo puts Cream back on its card');
      // the line's ⋯ (today's Brioche buns, for a sous chef) still says who wrote it, from the card
      await p.context().close();
      p = await L.open(b, '#/transfers', { who: 'sam', extra, width: w, height: 900, wait: 1600 });
      await L.waitFor(p, () => !!document.querySelector('.tr-card .nb-more'), null, 6000).catch(() => {});
      const more = await p.$('.tr-card .nb-more');
      if (more) { await more.click(); await L.settle(p, 200); }
      ok(!!more && /Written by Bo/.test(await txt(p, '#lm-sheet .lm-who') || ''), '390 px: the item\'s ⋯ says who wrote it, from its card');
    }
    await p.context().close();
  }

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
