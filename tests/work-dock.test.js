// The add button on the four work pages, as drawn in the agreed design (docs/work-pages-design-options/options.html,
// Option A, 3 Nov 2026): one full-width bar with a plus, docked right above the tab bar on a phone, the list scrolling
// above it and never hidden under it; in the page header on wider screens, with the count beside it. Wastage's
// end-of-day review is one button at the foot of the entries. Delivery received on Orders reads as an ordinary chip.
const L = require('./lib');
const { R, ok } = L.results();
const root = 'kitchens/' + L.PIN + '/', today = L.ymd(new Date(L.NOW));
const extra = {};
[['w1', 'Chips', 2, 'kg', 'excess', 'Fryer'], ['w2', 'Rice', 1.5, 'kg', 'expired', 'Pans']].forEach(([id, t, a, u, r, s], k) => {
  extra[root + 'waste/' + today + '/lines/' + id] = { text: t, amount: a, unit: u, reason: r, action: '', station: s, addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - (30 - k) * 60000, deleted: false };
});
extra[root + 'transfers/' + today + '/lines/t1'] = { dir: 'out', venue: 'Riviera', person: 'Jess', text: 'Brioche buns', amount: 2, unit: 'packs', note: '', addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - 1800000, deleted: false, by: 'bo' };
const PAGES = [['#/prep', '.nb-addline', 'Add a line'], ['#/orders', '.nb-addline', 'Add request'], ['#/waste', '.w-logbtn', 'Log waste'], ['#/transfers', '.tr-logbtn', 'Log a transfer']];
(async () => {
  const b = await L.start();
  for (const [w, h] of [[390, 844], [768, 1024], [1280, 900]]) {
    for (const [hash, sel, label] of PAGES) {
      const tag = w + ' px ' + hash.slice(2) + ': ';
      const p = await L.open(b, hash, { who: 'sam', extra, width: w, height: h, wait: 1600 });
      ok(await L.docked(p, sel), tag + (w < 720 ? label + ' is one full-width bar, docked right above the tab bar' : label + ' sits in the page header'));
      ok(await p.evaluate(([s, l]) => { const e = document.querySelector(s); return !!e && e.textContent.trim() === l && !!e.querySelector('svg.wk-plus'); }, [sel, label]), tag + 'the button says ' + label + ', with a plus');
      if (w < 720) {
        // scrolled to the end, the last line ends above the dock: nothing is hidden under it
        const clear = await p.evaluate(s => { window.scrollTo(0, document.documentElement.scrollHeight); const rows = [...document.querySelectorAll('#prep-root .nb-row, #prep-root .tr-row, .w-rvfoot')]; const last = rows[rows.length - 1]; const b = document.querySelector(s), dock = b && b.closest('.wk-dock'); if (!dock) return false; return !last || last.getBoundingClientRect().bottom <= dock.getBoundingClientRect().top + 1; }, sel);
        ok(clear, tag + 'scrolled to the end, the last line is not under the dock');
      } else {
        // the count sits beside the button, not in the middle of the header
        const gap = await p.evaluate(s => { const c = document.querySelector('.nb-ph .nb-prog'), bt = document.querySelector(s); return c && bt ? Math.round(bt.getBoundingClientRect().left - c.getBoundingClientRect().right) : -1; }, sel);
        ok(gap >= 0 && gap <= 40, tag + 'the count sits beside the button (' + gap + ' px apart)');
      }
      if (hash === '#/waste') {
        ok(await p.evaluate(() => { const rows = document.querySelectorAll('.nb-rows .nb-row'), rv = document.querySelector('.w-rvbtn'); return !!rv && rows.length > 0 && rv.getBoundingClientRect().top >= rows[rows.length - 1].getBoundingClientRect().bottom - 1; }), tag + 'the end-of-day review is at the foot of the entries');
      }
      if (hash === '#/orders') {
        ok(await p.evaluate(() => { const d = document.querySelector('.o-deliv'); if (!d) return false; const fs = parseFloat(getComputedStyle(d).fontSize); return fs <= 16 && d.scrollWidth <= d.clientWidth + 1 && d.scrollHeight <= d.clientHeight + 1; }), tag + 'Delivery received reads as an ordinary chip, its words inside it');
      }
      ok(!(await L.overflow(p)) && p.errors.length === 0, tag + 'no sideways scroll, no page errors ' + p.errors.join(' | '));
      await p.context().close();
    }
  }
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
