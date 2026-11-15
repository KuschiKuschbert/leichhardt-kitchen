// Long loan cards must fit the notebook, including the metadata line and return actions.
const L = require('./lib');
const { R, ok } = L.results();
const root = 'kitchens/' + L.PIN + '/', extra = {};
for (const [i, text, venue, amount, unit] of [
  [1, 'Chicken schnitzel', 'Sample Hotel', 40, 'kg'],
  [2, 'Schnitzel 300gm', 'Sample Bar and Grill by the Harbour', 2, 'boxes'],
  [3, 'Beef cheek mince', 'Sample Tavern', 9, 'packs'],
  [4, 'Flour', 'SampleHarbourRestaurantAndEventSpace', 5, 'kg']
]) {
  const date = L.ymd(new Date(L.NOW - 10 * 86400000));
  const record = { dir: 'out', venue, person: 'Chef', text, amount, unit, note: '', addedBy: 'Taylor', addedById: 'sam', addedAt: L.NOW - 10 * 86400000 + i * 60000, deleted: false, by: 'sam' };
  extra[root + 'transfers/' + date + '/lines/l' + i] = record;
  extra[root + 'transferOpen/' + date + '_l' + i] = { date, lineId: 'l' + i, record, open: true };
}
(async () => {
  const b = await L.start();
  for (const width of [360, 390, 768, 1280]) {
    for (const size of ['normal', 'large', 'xlarge']) {
      const p = await L.open(b, '#/transfers', { admin: true, extra, width, touch: true, settings: { text: size }, wait: 1200 });
      await L.waitFor(p, () => document.querySelectorAll('.tr-card').length === 4);
      if (process.env.REAL_FONTS) {
        await p.context().unroute(/fonts\.(googleapis|gstatic)\.com/);
        await p.addStyleTag({ url: 'https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Barlow:wght@400;600;700&family=Barlow+Condensed:wght@600;700&display=swap' });
        ok(await p.evaluate(async () => (await Promise.all(['700 22px Caveat', '400 16px Barlow', '700 16px "Barlow Condensed"'].map(f => document.fonts.load(f)))).every(r => r.length)), width + ' ' + size + ': actual app fonts loaded');
      }
      const fit = await p.evaluate(() => {
        const book = document.querySelector('.tr-cards').getBoundingClientRect();
        return [...document.querySelectorAll('.tr-card')].every(e => {
          const r = e.getBoundingClientRect();
          return r.left >= book.left - 1 && r.right <= book.right + 1 && e.scrollWidth <= e.clientWidth + 1;
        });
      });
      ok(fit && !(await L.overflow(p)), width + ' ' + size + ': long loan cards stay inside the notebook without clipped content');
      ok(await p.$$eval('.tr-ret', es => es.every(e => {
        const r = e.getBoundingClientRect(), item = e.closest('.tr-item').querySelector('.nb-main').getBoundingClientRect();
        return r.width >= 44 && r.height >= 44 && r.right <= innerWidth && r.left >= item.right - 1;
      })), width + ' ' + size + ': return actions remain visible beside their items at 44 px');
      ok(await p.$$eval('.tr-item .w-amt', es => es.every(e => {
        const main = e.closest('.nb-main').getBoundingClientRect(), range = document.createRange();
        range.selectNodeContents(e);
        return [...range.getClientRects()].every(r => r.left >= main.left - 1 && r.right <= main.right + 1);
      })), width + ' ' + size + ': quantities do not overlap the return button');
      ok(!p.errors.length, width + ' ' + size + ': no page errors');
      if (process.env.SHOTS && width === 390 && size === 'large') await p.screenshot({ path: process.env.SHOTS, fullPage: true });
      await p.context().close();
    }
  }
  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
