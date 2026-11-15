// A typed amount can include kitchen instructions. Keep it inside its row at every text size.
const L = require('./lib');
const { R, ok } = L.results();
const day = L.ymd(new Date(L.NOW)), root = 'kitchens/' + L.PIN + '/orders/' + day + '/lines/';
const amount = '24 portions for the evening service', extra = {};
for (const [id, text, qty] of [['long', 'Cream', amount], ['short', 'Flour', '12 kg']]) {
  extra['kitchens/' + L.PIN + '/days/' + day + '/items/' + id] = { text, qty, station: 'Larder', recipe: '', addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 600000, done: false, deleted: false };
  extra[root + id] = { text, qty, recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 600000, ordered: false, deleted: false };
}
(async () => {
  const b = await L.start();
  for (const route of ['prep', 'orders']) for (const width of [360, 390, 768, 1280]) {
    for (const who of ['ann', 'sam']) {
      const p = await L.open(b, '#/' + route, { who, extra, width, touch: true, wait: 1200 });
      await L.waitFor(p, () => !!document.querySelector('.nb-row[data-ln$="/long"] .nb-q'));
      if (process.env.REAL_FONTS) {
        await p.context().unroute(/fonts\.(googleapis|gstatic)\.com/);
        await p.addStyleTag({ url: 'https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Barlow:wght@400;600;700&family=Barlow+Condensed:wght@600;700&display=swap' });
        ok(await p.evaluate(async () => (await Promise.all(['700 22px Caveat', '700 16px Barlow', '700 16px "Barlow Condensed"'].map(f => document.fonts.load(f)))).every(r => r.length)), route + ' ' + width + ' ' + who + ': actual app fonts loaded');
      }
      for (const size of ['normal', 'large', 'xlarge']) {
        await p.evaluate(s => document.documentElement.setAttribute('data-text', s), size);
        const boxes = await p.evaluate(() => ['long', 'short'].map(id => {
          const q = document.querySelector('.nb-row[data-ln$="/' + id + '"] .nb-q');
          const main = q.closest('.nb-main').getBoundingClientRect(), range = document.createRange();
          range.selectNodeContents(q);
          const rects = [...range.getClientRects()];
          return { text: q.textContent, lines: rects.length, fits: rects.every(r => r.left >= main.left - 1 && r.right <= main.right + 1) };
        }));
        ok(boxes[0].fits && boxes[0].text.trim() === amount && !(await L.overflow(p)), route + ' ' + width + ' ' + who + ' ' + size + ': the full typed amount fits its row without overlapping controls');
        ok(boxes[1].fits && boxes[1].lines === 1, route + ' ' + width + ' ' + who + ' ' + size + ': short amounts stay together');
        if (process.env.SHOTS && width === 390 && who === 'sam' && size === 'xlarge') await p.screenshot({ path: process.env.SHOTS.replace('.png', '-' + route + '.png'), fullPage: true });
      }
      ok(!p.errors.length, route + ' ' + width + ' ' + who + ': no page errors');
      await p.context().close();
    }
  }
  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
