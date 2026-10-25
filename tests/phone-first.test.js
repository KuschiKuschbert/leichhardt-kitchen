// The first screen on a phone (usability U9a): the recipe name, yield and allergens come before the drawing, all five
// dockets fit on the landing page, and Settings starts with Text size and its Done goes back.
const L = require('./lib');
const { R, ok } = L.results();
const top = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top) : -1; }, sel);
const fsKey = k => ['kitchens', L.PIN].concat(k).join('/');
const P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true });
// Ann is the head chef here (headId), as in tests/manage.test.js
const cfg = () => ({ [fsKey(['config', 'main'])]: { people: [P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'head'), P('bo', 'Bo', 'staff')], headId: 'ann', sousIds: ['sam', 'ann'], pingIds: ['sam', 'ann'], showBadges: true } });
(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/r/barra', { wait: 1200 });
  const t = await top(p, '#rtitle'), a = await top(p, '#r-allergens'), d = await top(p, '.stage');
  ok(t > 0 && t < 360 && a > t && d > a, 'phone recipe: name, then allergens, then the drawing (' + [t, a, d] + ')');
  ok(await p.evaluate(() => !document.querySelector('.lens-fold').open), 'phone recipe: the allergen lens is folded');
  await p.click('.lens-fold summary'); await L.settle(p, 150);
  await p.click('[data-act="lens"][data-val="Fish"]'); await L.settle(p, 300);
  ok(await p.evaluate(() => document.querySelector('.lens-fold').open && /Fish/.test(document.querySelector('.lens-fold summary').textContent)), 'phone recipe: a lens that is on keeps the fold open and names it');
  ok(p.errors.length === 0, 'recipe: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a card with a how-to guide (23 Oct 2026): the guide box came above the name on a phone, now it keeps its laptop place
  p = await L.open(b, '#/r/rice', { who: 'bo', extra: L.guides(), wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('#r-guides .box'), null, 5000).catch(() => {});
  let g = [await top(p, '#rtitle'), await top(p, '#r-allergens'), await top(p, '.pan-art'), await top(p, '#r-guides .box')];
  ok(g[0] > 0 && g[1] > g[0] && g[2] > g[1] && g[3] > g[2], 'phone pan with a guide: name, allergens, the drawing, then the guide box (' + g + ')');
  await p.evaluate(() => { location.hash = '#/r/pork-belly'; }); await L.settle(p, 500);
  await L.waitFor(p, () => !!document.querySelector('#r-guides .box'), null, 5000).catch(() => {});
  g = [await top(p, '#rtitle'), await top(p, '#r-allergens'), await top(p, '#r-ing'), await top(p, '#r-guides .box'), await top(p, '.steps')];
  ok(g[0] > 0 && g[1] > g[0] && g[2] > g[1] && g[3] > g[2] && g[4] > g[3], 'phone dish with a guide: name, allergens, Everything on it, the guide box, then the method (' + g + ')');
  ok(p.errors.length === 0, 'guide on a card: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the head chef's Change this recipe sits right under the name on a phone and a tablet, not under the drawing
  for (const w of [390, 768]) {
    p = await L.open(b, '#/r/burger', { who: 'ann', extra: cfg(), width: w, wait: 1400 });
    await L.waitFor(p, () => !!document.querySelector('#r-edit a'), null, 5000).catch(() => {});
    const e = [await top(p, '#rtitle'), await top(p, '#r-edit a'), await top(p, '#r-allergens'), await top(p, '.stage')];
    ok(e[0] > 0 && e[1] > e[0] && e[2] > e[1] && e[3] > e[2], w + ' px head chef: name, Change this recipe, allergens, then the plate (' + e + ')');
    await p.context().close();
  }

  p = await L.open(b, '#/r/barra', { width: 1280, height: 900, wait: 1200 });
  const ing = await top(p, '#r-ing'), st = await top(p, '#r-steps');
  ok(ing > 0 && st > ing, 'dish: Everything on it comes before the method (' + [ing, st] + ')');
  await p.context().close();

  p = await L.open(b, '#/', { wait: 1200 });
  await L.waitFor(p, () => document.querySelectorAll('.dockets .docket').length === 6);
  const bottoms = await p.evaluate(() => [...document.querySelectorAll('.docket')].map(e => Math.round(e.getBoundingClientRect().bottom)));
  ok(bottoms.length === 6 && bottoms.every(x => x <= 844 - 68), 'landing: all six dockets fit above the tab bar (' + bottoms + ')');
  await p.click('.docket[href="#/settings"]', { timeout: 2000 }).catch(() => {});
  await p.evaluate(() => { location.hash = '#/r/laksa'; }); await L.settle(p, 300);
  await p.evaluate(() => { location.hash = '#/settings'; }); await L.settle(p, 400);
  const order = await p.evaluate(() => [...document.querySelectorAll('.settings .set-block .label')].map(e => e.textContent));
  ok(order[0] === 'Text size', 'settings: Text size comes first (' + order.slice(0, 3) + ')');
  // Opens with: each view shows a computer and a phone preview; tapping one marks it and the recipes open with it
  ok(await p.evaluate(() => [...document.querySelectorAll('.view-opt')].map(e => e.querySelectorAll('.vo-desk svg, .vo-phone svg').length).join()) === '2,2', 'settings: The Pass and Tiles each show a computer and a phone preview');
  await p.click('[data-k="setview:tiles"]'); await L.settle(p, 300);
  ok(await p.evaluate(() => document.querySelector('[data-k="setview:tiles"]').getAttribute('aria-checked') === 'true' && /Opens with this/.test(document.querySelector('[data-k="setview:tiles"]').textContent) && document.querySelector('[data-k="setview:pass"]').getAttribute('aria-checked') === 'false'), 'settings: tapping Tiles marks it as the one it opens with');
  await p.click('[data-k="setview:pass"]'); await L.settle(p, 300);
  await p.click('[data-act="done"]'); await L.settle(p, 400);
  ok(await p.evaluate(() => location.hash) === '#/r/laksa', 'settings: Done goes back to where you came from');
  ok(p.errors.length === 0, 'landing and settings: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Settings opened straight from its address: Done goes to the start
  p = await L.open(b, '#/settings', { wait: 800 });
  await p.click('[data-act="done"]'); await L.settle(p, 400);
  ok(await p.evaluate(() => location.hash) === '#/', 'settings opened directly: Done goes to the start');
  await p.context().close();
  await b.close();
  L.report(R);
})();
