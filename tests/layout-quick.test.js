// Quick layout fixes (usability U3): the phone tab bar no longer covers Zoom out or the admin Save bar, the skip link
// keeps the page, every admin tab can be seen on a laptop and a tablet, and Reset PIN fits on one line.
const L = require('./lib');
const { R, ok } = L.results();
// true when the middle of the element is really on top there (not covered by the tab bar or off screen)
const onTop = (p, sel) => p.evaluate(s => {
  const e = document.querySelector(s); if (!e) return 'missing';
  const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  if (y < 0 || y > innerHeight || x < 0 || x > innerWidth) return 'off screen ' + Math.round(x) + ',' + Math.round(y);
  const h = document.elementFromPoint(x, y);
  return !!h && (e === h || e.contains(h)) ? true : 'covered by ' + (h ? h.tagName + '.' + h.className : 'nothing');
}, sel);
(async () => {
  const b = await L.start();
  let p, v;

  // phone: Zoom out on a sub-recipe sits above the tab bar
  p = await L.open(b, '#/r/poutine/american-cheese-sauce', { wait: 1000 });
  v = await onTop(p, '.zoombar a');
  ok(v === true, 'phone recipe: Zoom out can be tapped, not under the tab bar (' + v + ')');
  ok(p.errors.length === 0, 'phone recipe: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // laptop: the skip link focuses the page and keeps the recipe open
  p = await L.open(b, '#/r/poutine', { width: 1280, height: 900, wait: 1000 });
  await p.focus('a.skip');
  const sk = await p.evaluate(() => document.activeElement && document.activeElement.className);
  await p.keyboard.press('Enter');
  await L.settle(p, 300);
  ok(sk === 'skip' && await p.evaluate(() => location.hash) === '#/r/poutine' && await p.evaluate(() => document.activeElement && document.activeElement.id) === 'main', 'skip link: focuses the content and the recipe stays open');
  await p.context().close();

  // admin: every tab can be seen and tapped at 1280 and 768, and Tools opens
  for (const w of [1280, 768]) {
    p = await L.open(b, '#/admin', { admin: true, width: w, height: 900, wait: 1800 });
    v = await onTop(p, '[data-p="a-group"][data-g="settings"]');
    ok(v === true, w + ' admin: the Settings group can be seen and tapped (' + v + ')');
    v = await onTop(p, '[data-p="a-group"][data-g="people"]');
    ok(v === true, w + ' admin: the People group can be seen and tapped (' + v + ')');
    await L.adminTab(p, 'people'); await L.settle(p, 300);
    const h = await p.evaluate(() => Math.max(...[...document.querySelectorAll('[data-p="a-reset-pin"]')].map(e => e.getBoundingClientRect().height)));
    ok(h > 0 && h <= 52, w + ' admin: Reset PIN fits on one line (' + Math.round(h) + ' px high)');
    ok(p.errors.length === 0, w + ' admin: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // phone admin: the Save bar sits above the tab bar
  p = await L.open(b, '#/admin', { admin: true, wait: 1800 });
  await L.adminTab(p, 'people'); await L.settle(p, 300);
  // nothing changed yet: no Save bar over the list (22 Oct 2026, Option B)
  ok(await p.evaluate(() => { const e = document.querySelector('[data-p="a-save"]'); return !e || !e.getClientRects().length; }), 'phone admin: no Save bar while nothing has changed');
  await p.fill('#a-n0', 'Sam B'); await p.$eval('#a-n0', e => e.dispatchEvent(new Event('input', { bubbles: true }))); await L.settle(p, 300);
  await p.evaluate(() => window.scrollTo(0, 0)); await L.settle(p, 150);
  v = await onTop(p, '[data-p="a-save"]');
  ok(v === true, 'phone admin: Save changes can be tapped, not under the tab bar (' + v + ')');
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.a-nav')).position === 'sticky'), 'phone admin: the admin nav stays at the top (it tucks away while scrolling down, admin-nav.test.js)');
  await p.context().close();

  await b.close();
  L.report(R);
})();
