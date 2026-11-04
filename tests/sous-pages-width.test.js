// A sous chef's own pages on a laptop (5 Nov 2026, admin pages step 7, docs/admin-pages-options/brief.md): Manage staff,
// Shift pings and the Meeting minutes register use the page's width. The 20 Oct chapter styles made every .p-admin a
// two-column grid from 1100 px, so on these pages the staff list, a ping or the register sat in a 192 px column with
// the rest beside it. Example data only.
const L = require('./lib');
const { R, ok } = L.results();
(async () => {
  const b = await L.start();
  for (const width of [1280, 1100, 390]) {
    for (const [k, page] of [['staff', '.p-staff-page'], ['pings', '.p-notes-page'], ['register', '.p-minutes-page']]) {
      const p = await L.open(b, '#/prep', { who: 'sam', width, height: 900, wait: 1500 });
      await p.evaluate(k => window.LK_PREP.chefOpen(k), k); await L.settle(p, 800);
      const m = await p.evaluate(sel => {
        const pg = document.querySelector(sel); if (!pg) return null;
        const kids = [...pg.children].filter(e => e.tagName !== 'H2' && e.getClientRects().length);
        const w = pg.getBoundingClientRect().width;
        return { page: Math.round(w), narrow: kids.filter(e => e.getBoundingClientRect().width < w - 2).map(e => e.className + ' ' + Math.round(e.getBoundingClientRect().width)), display: getComputedStyle(pg).display };
      }, page);
      ok(!!m && m.narrow.length === 0, width + ' ' + k + ': every block is as wide as the page (' + JSON.stringify(m) + ')');
      if (k === 'staff' && m) ok(await p.evaluate(() => { const l = document.querySelector('.p-staff-page > .set-block:not(.a-savebar)'), s = document.querySelector('.p-staff-page > .a-savebar'); return !!l && !!s && s.getBoundingClientRect().top >= l.getBoundingClientRect().bottom - 1; }), width + ' staff: the Save bar is under the list, not beside it');
      ok(!(await L.overflow(p)), width + ' ' + k + ': no sideways scroll');
      ok(p.errors.length === 0, width + ' ' + k + ': no page errors ' + p.errors.join(' | '));
      await p.context().close();
    }
  }
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
