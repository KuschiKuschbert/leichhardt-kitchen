// Keyboard return to the open recipe card and the controls that redraw Print cards.
const L = require('./lib');
const { R, ok } = L.results();

async function recipeBack(browser, width, view) {
  const p = await L.open(browser, '#/recipes', { who: '', noPin: true, width, settings: { view } });
  try {
    const card = p.locator('main a[href="#/r/carbonara"]').first();
    await card.scrollIntoViewIfNeeded();
    await card.focus();
    const before = await card.evaluate(el => ({ top: el.getBoundingClientRect().top, y: scrollY }));
    const next = await card.evaluate(el => el.nextElementSibling.getAttribute('href'));
    await p.keyboard.press('Enter');
    await L.waitFor(p, () => document.querySelector('#rtitle')?.textContent === 'Carbonara');
    await p.locator('.wtop-back').press('Enter');
    await L.waitFor(p, () => location.hash === '#/recipes' && !!document.getElementById('find'));
    await L.settle(p, 250);
    const after = await card.evaluate(el => ({ top: el.getBoundingClientRect().top, y: scrollY, focused: document.activeElement === el }));
    const label = width + ' px ' + view;
    ok(before.y > 1000 && Math.abs(before.top - after.top) <= 2, label + ': Back restores the opened card position');
    ok(after.focused, label + ': Back focuses the opened card');
    await p.keyboard.press('Tab');
    ok(await p.evaluate(href => document.activeElement.getAttribute('href') === href && scrollY > 1000, next), label + ': Tab continues through the recipe list');
    ok(!p.errors.length, label + ': no page errors');
  } finally { await p.context().close(); }
}

async function printChoices(browser, width) {
  const p = await L.open(browser, '#/manage/print/burger', { who: 'sam', width });
  try {
    const label = width + ' px Print cards';
    await L.waitFor(p, () => !!document.querySelector('.rcp-row'));
    const paper = p.locator('[data-rcp="paper"][data-v="a4l"]');
    await paper.focus();
    await p.keyboard.press('Enter');
    ok(await paper.getAttribute('aria-pressed') === 'true', label + ': chooses A4 sideways');
    ok(await paper.evaluate(el => document.activeElement === el), label + ': the paper choice keeps keyboard focus');
    await p.keyboard.press('Tab');
    ok(await p.evaluate(() => document.activeElement.dataset.v === 'a5l'), label + ': Tab moves to the next paper');

    const group = p.locator('[data-rcp="group"][data-v="m:Kids"]');
    await group.focus();
    const before = await group.evaluate(el => ({ x: el.parentElement.scrollLeft, y: scrollY }));
    await p.keyboard.press('Enter');
    const after = await group.evaluate(el => ({ x: el.parentElement.scrollLeft, y: scrollY, focused: document.activeElement === el }));
    ok(await group.getAttribute('aria-pressed') === 'true' && await L.txt(p, '.rcp-status') === 'Ticked Kids: 1 card.', label + ': ticks the group and updates its status');
    ok(after.focused, label + ': the group keeps keyboard focus');
    ok((width !== 390 || before.x > 0) && after.x === before.x && after.y === before.y, label + ': the group row and page keep their scroll position');
    const previous = await group.evaluate(el => el.previousElementSibling.dataset.v);
    await p.keyboard.press('Shift+Tab');
    ok(await p.evaluate(v => document.activeElement.dataset.rcp === 'group' && document.activeElement.dataset.v === v, previous), label + ': Shift+Tab moves to the previous group');
    ok(!p.errors.length, label + ': no page errors');
  } finally { await p.context().close(); }
}

(async () => {
  const browser = await L.start();
  try {
    await recipeBack(browser, 390, 'pass');
    await recipeBack(browser, 1280, 'tiles');
    await printChoices(browser, 390);
    await printChoices(browser, 1280);
  } finally { await browser.close(); }
  L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
