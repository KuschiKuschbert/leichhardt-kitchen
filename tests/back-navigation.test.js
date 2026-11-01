// Contextual return paths stay inside this run of the book. Parent list links remain available, typed work and
// filters survive the return, and Back/Forward and Settings Done share the same route trail.
const L = require('./lib');
const { R, ok } = L.results();
const back = p => p.locator('.wtop [data-act="back"]');
const hash = p => p.evaluate(() => location.hash);
async function go(p, h) {
  await p.evaluate(v => { location.hash = v; }, h);
  await L.waitFor(p, v => location.hash === v && !!document.querySelector('.wtop [data-act="back"]'), h, 6000);
  await L.settle(p, 200);
}
async function returned(p, h) {
  await L.waitFor(p, v => location.hash === v, h, 6000);
  await L.settle(p, 200);
}
(async () => {
  const b = await L.start();
  let p;
  // The arrow replaces the logo, so returning never adds a row or makes the header taller.
  for (const width of [390, 768, 1280]) for (const text of ['normal', 'xlarge']) {
    const screen = width + ' ' + text;
    p = await L.open(b, '#/orders', { width, settings: { text }, wait: 1600 });
    ok(await back(p).getAttribute('aria-label') === 'Back to Kitchen Book', screen + ': a direct page has a named local fallback');
    const box = await back(p).boundingBox(), icon = await back(p).locator('svg').boundingBox();
    const header = await p.locator('.wtop').boundingBox();
    ok(box && Math.abs(box.height - 44) <= 1 && Math.abs(box.width - 44) <= 1 && icon && icon.width >= 18 && icon.width <= 20.5 && icon.height <= 20.5, screen + ': compact arrow keeps a 44 px tap target with an 18 to 20 px icon');
    ok(await back(p).count() === 1 && await p.locator('.page-return').count() === 0 && (await back(p).innerText()).trim() === '', screen + ': one icon-only return control uses the existing header');
    ok(await p.evaluate(() => {
      const arrow = document.querySelector('.wtop [data-act="back"]'), brand = document.querySelector('.wtop-brand'), who = document.querySelector('.wtop-who');
      if (!arrow || !brand || !who) return false;
      const a = arrow.getBoundingClientRect(), b = brand.getBoundingClientRect(), w = who.getBoundingClientRect(), nav = document.querySelector('.wtop .pnav');
      const n = nav && nav.getBoundingClientRect(), brandFits = !b.width || a.right <= b.left + 1 && b.right <= w.left + 1;
      return brandFits && (!n || !n.width || a.right <= n.left + 1) && a.right <= w.left && a.top >= 0 && getComputedStyle(arrow).borderTopWidth === '0px';
    }), screen + ': arrow, title and chef menu fit without overlap or a button outline');
    ok(!(await L.overflow(p)), screen + ': the order page fits with enlarged text');
    if (width === 1280 && text === 'xlarge') { await back(p).focus(); await p.keyboard.press('Enter'); }
    else await back(p).click();
    await returned(p, '#/');
    const landingHeader = await p.locator('.wtop').boundingBox();
    ok(header && landingHeader && header.height <= landingHeader.height + 1, screen + ': Back does not increase the header height');
    ok(await back(p).count() === 0 && await p.locator('.dockets').count() === 1, screen + ': direct-page Back reaches the landing page without leaving the book');
    ok(!(await L.overflow(p)) && p.errors.length === 0, screen + ': no overflow or page errors');
    await p.context().close();
  }

  p = await L.open(b, '#/prep', { extra: L.guides(), wait: 1600 });
  await p.fill('#p-text', 'Keep this prep draft');
  await p.fill('#p-qty', '2 tubs');
  await go(p, '#/r/pork-belly');
  ok(await back(p).getAttribute('aria-label') === 'Back to prep list', 'recipe opened from Prep names the actual return destination');
  await go(p, '#/guides/combi');
  ok(await back(p).getAttribute('aria-label') === 'Back to recipe' && await p.locator('.g-top a[href="#/guides"]').count() === 1, 'guide offers contextual return and its separate All guides action');
  await back(p).click(); await returned(p, '#/r/pork-belly');
  ok(await back(p).getAttribute('aria-label') === 'Back to prep list', 'Back from a guide restores the recipe return trail');
  await back(p).click(); await returned(p, '#/prep');
  ok(await p.inputValue('#p-text') === 'Keep this prep draft' && await p.inputValue('#p-qty') === '2 tubs', 'Back restores typed prep work without saving it');
  ok(!(await p.evaluate(() => Object.values(window.__fake.dump()).some(x => x && x.text === 'Keep this prep draft'))), 'return navigation does not write the typed line');
  await p.goForward(); await returned(p, '#/r/pork-belly');
  ok(await back(p).getAttribute('aria-label') === 'Back to prep list', 'browser Forward restores the same bounded return path');
  await go(p, '#/settings');
  await L.choose(p, '[data-act="settext"][data-val="large"]');
  await p.click('[data-act="done"]'); await returned(p, '#/r/pork-belly');
  ok(await back(p).getAttribute('aria-label') === 'Back to prep list', 'Settings Done returns to its origin after a settings redraw');
  ok(p.errors.length === 0, 'contextual paths: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  p = await L.open(b, '#/recipes', { wait: 1400 });
  await p.fill('#find', 'burger'); await L.settle(p, 250);
  await p.click('#shelves a.dish[href="#/r/burger"]'); await L.settle(p, 250);
  await back(p).click(); await returned(p, '#/recipes');
  ok(await p.inputValue('#find') === 'burger', 'recipe return keeps the list search and filters');
  await go(p, '#/settings');
  await p.reload(); await L.settle(p, 1500);
  await p.click('[data-act="done"]'); await returned(p, '#/');
  ok(await hash(p) === '#/', 'a reload starts a fresh safe trail, so Settings Done cannot leave the book');
  ok(p.errors.length === 0, 'search and reload: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  p = await L.open(b, '#/r/barra/laksa', { wait: 1300 });
  const parent = '#/r/barra';
  await back(p).click(); await returned(p, parent);
  ok(await hash(p) === parent, 'a direct sub-recipe goes to its parent without depending on browser history');
  ok(p.errors.length === 0, 'direct recipe: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // A link in a sheet leaves its same-address entry behind. Contextual Back must not need a dead extra tap there.
  const today = L.ymd(new Date(L.NOW)), pingKey = ['kitchens', L.PIN, 'notes', 'back-link'].join('/');
  p = await L.open(b, '#/orders', { extra: { [pingKey]: { text: 'Chicken Burger today', tag: 'none', start: today, until: today, dows: [], tm: 835, removed: false, at: 1, by: 'sam' } }, wait: 1700 });
  if (await p.$('.nt')) { await p.click('.nt [data-note="dismiss"]'); await L.settle(p, 400); }
  await go(p, '#/prep');
  await p.click('[data-note="open"]');
  await p.click('.nt [data-note="link"]'); await returned(p, '#/r/burger');
  ok(await back(p).getAttribute('aria-label') === 'Back to prep list', 'a recipe link in a ping retains the page underneath as its return');
  await back(p).click(); await returned(p, '#/prep');
  ok(!await p.$('.nt') && await back(p).getAttribute('aria-label') === 'Back to order list', 'Back from a ping link returns to Prep with the sheet closed and names the return destination');
  await back(p).click(); await returned(p, '#/orders');
  ok(await hash(p) === '#/orders', 'next contextual Back skips the closed sheet entry and reaches Orders in one tap');
  ok(p.errors.length === 0, 'ping link return trail: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  L.report(R);
})();
