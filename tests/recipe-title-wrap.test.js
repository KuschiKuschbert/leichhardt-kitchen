// A valid culinary word must not run under the recipe number or drawing at larger text sizes.
const L = require('./lib');
const { R, ok } = L.results(), root = 'kitchens/' + L.PIN + '/';
const r = { id: 'word-test', no: '999', kind: 'batch', name: 'Worcestershire', yield: '1 L', ingredients: [{ q: '100 g', name: 'Flour', tags: ['Gluten'] }], sections: [{ title: 'Method', steps: ['Synthetic layout fixture only.'] }], art: 'gravy' };
const extra = { [root + 'book/index']: { r: { 'word-test': 1 } }, [root + 'recipes/word-test']: { r, v: 1, upd: L.NOW - 60000, by: 'sam', src: 'new', removed: false } };
(async () => {
  const b = await L.start();
  for (const width of [360, 390, 768, 1280]) {
    for (const route of ['#/recipes', '#/r/word-test']) {
      const p = await L.open(b, route, { extra, width, settings: { view: 'tiles' }, wait: 1200 });
      const sel = route === '#/recipes' ? '.tile[href="#/r/word-test"]' : '.card-head';
      await L.waitFor(p, s => !!document.querySelector(s) && document.querySelector(s).textContent.includes('Worcestershire'), sel);
      if (process.env.REAL_FONTS) {
        await p.context().unroute(/fonts\.(googleapis|gstatic)\.com/);
        await p.addStyleTag({ url: 'https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Barlow:wght@400;600;700&family=Barlow+Condensed:wght@600;700&display=swap' });
        ok(await p.evaluate(async () => (await Promise.all(['700 22px Caveat', '400 16px Barlow', '700 16px "Barlow Condensed"'].map(f => document.fonts.load(f)))).every(r => r.length)), width + ' ' + route + ': actual app fonts loaded');
      }
      for (const size of ['normal', 'large', 'xlarge']) {
        await p.evaluate(s => document.documentElement.setAttribute('data-text', s), size);
        const fits = await p.locator(sel).evaluate(e => {
          const title = e.querySelector('.t-name,h2'), box = title.getBoundingClientRect(), range = document.createRange();
          range.selectNodeContents(title);
          return [...range.getClientRects()].every(r => r.left >= box.left - 1 && r.right <= box.right + 1);
        });
        ok(fits && !(await L.overflow(p)), width + ' ' + route + ' ' + size + ': the full title stays in its column beside the number or drawing');
        if (process.env.SHOTS && width === 390 && size === 'xlarge') await p.locator(sel).screenshot({ path: process.env.SHOTS.replace('.png', route === '#/recipes' ? '-tile.png' : '-heading.png') });
      }
      ok(!p.errors.length, width + ' ' + route + ': no page errors');
      await p.context().close();
    }
  }
  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
