const L = require('./lib');
const { R, ok } = L.results();

const drawer = '.dw-drawer';
const close = drawer + ' [data-dw="shut"]';
const canvas = '.dw-svg';
const tool = name => `.dw-ctx [data-v="${name}"]`;
const focused = p => p.evaluate(() => {
  const active = document.activeElement;
  return active.matches('.dw-ctx [data-dw]') ? active.dataset.v || active.dataset.dw
    : active.matches('.dw-svg') ? 'canvas' : active.tagName;
});

(async () => {
  const browser = await L.start();
  try {
    for (const width of [390, 1280]) {
      const p = await L.open(browser, '#/manage/draw/new/burger/plate', {
        who: 'sam', width, height: 844, settings: { text: width === 390 ? 'xlarge' : 'normal' }
      });
      await L.waitFor(p, () => !!document.querySelector('.dw-ctx [data-v="lib"]'));
      const checkFocus = async (name, expect) => {
        const actual = await focused(p);
        ok(actual === expect, `${width} px: ${name} focuses ${expect} (was ${actual})`);
      };
      const closePanel = async () => {
        await p.locator(close).press('Enter');
        ok(await p.locator(drawer).count() === 0, `${width} px: Close removes the drawer`);
      };

      await p.locator(tool('lib')).press('Enter');
      await closePanel();
      await checkFocus('closing Add food', 'lib');
      await p.keyboard.press('Tab');
      await checkFocus('Tab after closing Add food', 'ware');

      await p.locator(tool('more')).press('Enter');
      await p.locator(drawer + ' [data-v="parts"]').press('Enter');
      await closePanel();
      await checkFocus('closing Parts list with no surviving opener', 'canvas');

      await p.locator(tool('lib')).press('Enter');
      await p.locator('#dw-q').fill('rump');
      await p.locator('.dw-tile[data-v="rump"]').press('Enter');
      await p.locator(tool('pmore')).press('Enter');
      await closePanel();
      await checkFocus('closing the picked part’s More', 'pmore');
      await p.keyboard.press('Tab');
      await checkFocus('Tab after closing the picked part’s More', 'del');

      await p.locator(tool('pmore')).press('Enter');
      await p.locator(close).press('Escape');
      ok(await p.locator(drawer).count() === 0 && await p.locator('.dw-el.on').count() === 1,
        `${width} px: Escape dismisses the drawer and keeps the picked part`);
      await checkFocus('Escape from the drawer', 'canvas');
      ok(!p.errors.length, `${width} px: no browser errors (${p.errors.join(', ')})`);
      await p.context().close();
    }
  } finally { await browser.close(); }
  L.report(R);
})().catch(error => { console.error(error); process.exit(1); });
