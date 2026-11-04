// Search boxes keep their own height (3 Nov 2026, recipe editor audit X1). The shared search wrapper grows in a row
// (flex 1 1 10rem), but inside a field, which stacks its label and box in a column, that 10rem became its height: about
// 110 px of empty space under Find a recipe, Find a drawing and every other search box set in a field.
const L = require('./lib');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true });
const cfg = () => ({ [fsKey(['config', 'main'])]: { people: [P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'head'), P('bo', 'Bo', 'staff')], headId: 'ann', sousIds: ['sam', 'ann'], pingIds: ['sam', 'ann'], showBadges: true } });
// every search box on the page: the wrapper is as tall as its box plus the status line under it, when that shows
const gaps = p => p.evaluate(() => [...document.querySelectorAll('.ux-search')].filter(w => w.getClientRects().length).map(w => {
  const box = w.querySelector('input'), st = w.querySelector('.ux-search-status');
  const stH = st && st.getClientRects().length ? st.getBoundingClientRect().height + parseFloat(getComputedStyle(st).marginTop || 0) : 0;
  return { id: box && (box.id || box.getAttribute('data-f') || box.getAttribute('data-dwf') || box.className), extra: Math.round(w.getBoundingClientRect().height - box.getBoundingClientRect().height - stH) };
}));
const pages = [
  ['#/manage', 'Find a recipe', p => L.waitFor(p, () => !!document.getElementById('mg-q'), null, 15000)],
  ['#/manage/draw/new/burger/plate', 'Find a drawing', p => L.waitFor(p, () => !!document.getElementById('dw-q'), null, 20000)],
  ['#/guides', 'Guides search', p => L.settle(p, 600)],
  // the admin wastage history's Logged by box sits in a stacked admin field (.a-f), the same column as a field
  ['#/admin', 'Wastage Logged by', async p => {
    await L.adminTab(p, 'waste'); await L.waitFor(p, () => !!document.querySelector('[data-lv="waste-log"]'));
    await p.click('.wh-filters > summary'); await L.waitFor(p, () => !!document.querySelector('[data-k="wh-who"]') && !!document.querySelector('[data-k="wh-who"]').closest('.ux-search'));
  }, { admin: true, who: '' }]
];
const day = L.ymd(new Date(L.NOW - 2 * 86400000));
const waste = { [fsKey(['waste', day, 'lines', 'fillet'])]: { text: 'Fish fillets', amount: 2, unit: 'kg', reason: 'expired', station: 'Grill', action: '', addedBy: 'Ann', addedById: 'ann', addedAt: new Date(day + 'T18:00:00+10:00').getTime(), deleted: false } };

(async () => {
  const b = await L.start();
  for (const [w, h] of [[390, 844], [768, 1024], [1280, 900]]) {
    for (const [hash, name, ready, as] of pages) {
      const p = await L.open(b, hash, Object.assign({ who: 'ann', extra: Object.assign(as ? {} : cfg(), L.guides(), waste), wait: 1400, width: w, height: h }, as || {}));
      try {
        await ready(p); await L.settle(p, 300);
        const g = await gaps(p);
        ok(g.length > 0, name + ' @' + w + ': the page has a search box (' + g.length + ')');
        // a row may stretch the wrapper a few px to its tallest neighbour, which shows nothing; the fault was 110 px
        const bad = g.filter(x => x.extra > 8);
        ok(!bad.length, name + ' @' + w + ': each search box is no taller than its box and status line' + (bad.length ? ' (' + bad.map(x => x.id + ' +' + x.extra + ' px').join(', ') + ')' : ''));
        ok(!p.errors.length, name + ' @' + w + ': no page errors ' + p.errors.join(' | '));
      } catch (e) { ok(false, name + ' @' + w + ': ' + e.message.split('\n')[0]); }
      await p.context().close();
    }
  }
  await b.close();
  L.report(R);
})();
