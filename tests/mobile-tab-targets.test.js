const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const L = require('./lib');
const { R, ok } = L.results();

const routes = ['recipes', 'prep', 'orders', 'waste', 'transfers', 'cleaning'];
const displayFont = join(__dirname, '../docs/cleaning-chef-options/fonts/barlow-condensed.woff2');

async function check(browser, width, text, bundledFont = false) {
  const p = await L.open(browser, '#/cleaning', { width, who: 'ann', touch: true, settings: { text } });
  const label = `${width} px ${text}${bundledFont ? ' with Barlow Condensed' : ''}`;
  try {
    await L.waitFor(p, () => document.querySelectorAll('.tabbar a').length === 6);
    if (bundledFont) {
      const font = readFileSync(displayFont).toString('base64');
      await p.addStyleTag({ content: `@font-face { font-family: 'Barlow Condensed'; font-weight: 700; src: url(data:font/woff2;base64,${font}); }` });
      await p.evaluate(async () => {
        const faces = await document.fonts.load("700 16px 'Barlow Condensed'");
        if (!faces.length || faces.some(face => face.status !== 'loaded')) throw new Error('Barlow Condensed did not load');
      });
    }
    const targets = await p.locator('.tabbar a').evaluateAll(links => links.map(link => {
      const box = link.getBoundingClientRect();
      const x = box.left + box.width / 2;
      const y = box.top + box.height / 2;
      const words = link.querySelector('span').getBoundingClientRect();
      const destinationAt = delta => document.elementFromPoint(x + delta, y)?.closest('.tabbar a')?.hash;
      return {
        hash: link.hash, x, y, width: box.width, height: box.height,
        labelFits: words.left >= box.left - 1 && words.right <= box.right + 1,
        sides: [destinationAt(-21), destinationAt(21)]
      };
    }));
    ok(targets.map(t => t.hash).join() === routes.map(r => '#/' + r).join(), label + ' retains the six destinations in order');
    ok(targets.every(t => t.width >= 44 && t.height >= 44 && t.sides.every(side => side === t.hash)),
      label + ' gives each tab a separate 44 px target (' + targets.map(t => t.width.toFixed(1)).join(', ') + ')');
    ok(targets.every(t => t.labelFits) && await L.overflow(p) <= 0, label + ' keeps every label inside its own target and fits the screen');

    const prep = targets.find(t => t.hash === '#/prep');
    await p.touchscreen.tap(prep.x + 21, prep.y);
    await L.waitFor(p, () => location.hash !== '#/cleaning', null, 2000);
    ok(await p.evaluate(() => location.hash) === '#/prep', label + ' a touch just right of Prep opens Prep');
    ok(p.errors.length === 0, label + ' opens without browser errors');
  } finally {
    await p.context().close();
  }
}

(async () => {
  const browser = await L.start();
  try {
    for (const width of [320, 360, 390]) {
      for (const text of ['normal', 'xlarge']) await check(browser, width, text);
    }
    await check(browser, 320, 'xlarge', true);
  } finally {
    await browser.close();
  }
  L.report(R);
})().catch(error => { console.log(R.join('\n')); console.error(error); process.exit(1); });
