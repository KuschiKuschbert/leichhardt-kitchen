// The first screen on a phone (usability U9a): the recipe name, yield and allergens come before the drawing, all five
// dockets fit on the landing page, and Settings starts with Text size and its Done goes back.
const L = require('./lib');
const { R, ok } = L.results();
const top = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top) : -1; }, sel);
(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/r/barra', { wait: 1200 });
  const t = await top(p, '#rtitle'), a = await top(p, '#r-allergens'), d = await top(p, '.stage');
  ok(t > 0 && t < 360 && a > t && d > a, 'phone recipe: name, then allergens, then the drawing (' + [t, a, d] + ')');
  ok(await p.evaluate(() => !document.querySelector('.lens-fold').open), 'phone recipe: the allergen lens is folded');
  await p.click('.lens-fold summary'); await p.waitForTimeout(150);
  await p.click('[data-act="lens"][data-val="Fish"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.querySelector('.lens-fold').open && /Fish/.test(document.querySelector('.lens-fold summary').textContent)), 'phone recipe: a lens that is on keeps the fold open and names it');
  ok(p.errors.length === 0, 'recipe: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  p = await L.open(b, '#/r/barra', { width: 1280, height: 900, wait: 1200 });
  const ing = await top(p, '#r-ing'), st = await top(p, '#r-steps');
  ok(ing > 0 && st > ing, 'dish: Everything on it comes before the method (' + [ing, st] + ')');
  await p.context().close();

  p = await L.open(b, '#/', { wait: 1200 });
  const bottoms = await p.evaluate(() => [...document.querySelectorAll('.docket')].map(e => Math.round(e.getBoundingClientRect().bottom)));
  ok(bottoms.length === 5 && bottoms.every(x => x <= 844 - 68), 'landing: all five dockets fit above the tab bar (' + bottoms + ')');
  await p.click('.docket[href="#/settings"]').catch(() => {});
  await p.evaluate(() => { location.hash = '#/r/laksa'; }); await p.waitForTimeout(300);
  await p.evaluate(() => { location.hash = '#/settings'; }); await p.waitForTimeout(400);
  const order = await p.evaluate(() => [...document.querySelectorAll('.settings .set-block .label')].map(e => e.textContent));
  ok(order[0] === 'Text size', 'settings: Text size comes first (' + order.slice(0, 3) + ')');
  // Opens with: each view shows a computer and a phone preview; tapping one marks it and the recipes open with it
  ok(await p.evaluate(() => [...document.querySelectorAll('.view-opt')].map(e => e.querySelectorAll('.vo-desk svg, .vo-phone svg').length).join()) === '2,2', 'settings: The Pass and Tiles each show a computer and a phone preview');
  await p.click('[data-k="setview:tiles"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.querySelector('[data-k="setview:tiles"]').getAttribute('aria-checked') === 'true' && /Opens with this/.test(document.querySelector('[data-k="setview:tiles"]').textContent) && document.querySelector('[data-k="setview:pass"]').getAttribute('aria-checked') === 'false'), 'settings: tapping Tiles marks it as the one it opens with');
  await p.click('[data-k="setview:pass"]'); await p.waitForTimeout(300);
  await p.click('[data-act="done"]'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => location.hash) === '#/r/laksa', 'settings: Done goes back to where you came from');
  ok(p.errors.length === 0, 'landing and settings: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Settings opened straight from its address: Done goes to the start
  p = await L.open(b, '#/settings', { wait: 800 });
  await p.click('[data-act="done"]'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => location.hash) === '#/', 'settings opened directly: Done goes to the start');
  await p.context().close();
  await b.close();
  L.report(R);
})();
