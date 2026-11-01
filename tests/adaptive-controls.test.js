const L = require('./lib');
const { R, ok } = L.results();
(async () => {
  const b = await L.start();
  for (const width of [390, 768, 1280]) {
    const p = await L.open(b, '#/recipes', { width, wait: 1200 });
    const input = p.locator('#find');
    await input.fill('chicken'); await L.settle(p, 300);
    const before = await p.locator('#find').getAttribute('data-committed-query');
    await input.blur(); await input.focus();
    ok(await input.inputValue() === '' && before === 'chicken', width + ': refocus clears the draft while keeping the committed query');
    ok((await input.getAttribute('placeholder')).includes("Filtering by 'chicken'"), width + ': refocus explains the retained results');
    await input.fill('b'); await L.settle(p, 220);
    ok(await input.getAttribute('data-committed-query') === 'chicken', width + ': one character does not replace results');
    await input.blur(); ok(await input.inputValue() === 'chicken', width + ': accidental focus restores the previous query');
    await input.focus(); await input.fill('be'); await L.settle(p, 250);
    ok(await input.getAttribute('data-committed-query') === 'be', width + ': two characters commit the replacement');
    await input.locator('..').locator('.ux-search-clear').click();
    ok(await input.inputValue() === '' && await input.getAttribute('data-committed-query') === '', width + ': explicit reset clears draft and committed query');
    // Exercise the real compact choice control, not the hidden legacy chip.
    const group = p.locator('[data-act="kind"]').first().locator('..');
    await group.evaluate(el => el.nextElementSibling.click());
    await L.settle(p, 220);
    ok(await p.locator('.ux-picker').count() === 1 && await p.locator('.ux-picker input[type="search"]').count() === ((await group.locator('button').count()) > 12 ? 1 : 0), width + ': search visibility follows the choice threshold');
    const geometry = await p.locator('.ux-picker').evaluate(el => { const r = el.getBoundingClientRect(); return { bottom: r.bottom, top: r.top, height: innerHeight }; });
    ok(width < 768 ? Math.abs(geometry.bottom - geometry.height) < 2 : geometry.top > 0, width + ': responsive picker placement');
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter');
    ok(await p.locator('.ux-picker').count() === 0, width + ': keyboard selection commits and closes');
    await p.evaluate(() => {
      const select = document.createElement('select'); select.id = 'ux-many'; select.setAttribute('aria-label', 'Many choices');
      for (let i = 0; i < 160; i++) select.add(new Option('Choice ' + i, String(i)));
      document.querySelector('#main').append(select); window.LK_UX.enhance(document);
    });
    await p.locator('#ux-many + .ux-picker-trigger').click();
    ok(await p.locator('.ux-picker input[type="search"]').count() === 1 && await p.locator('.ux-picker-option').count() <= 24, width + ': extended choices use search and window large lists');
    await p.locator('.ux-picker input').fill('Choice 149'); await p.locator('.ux-picker input').press('Enter');
    await p.locator('.ux-picker-option').click();
    ok(await p.locator('#ux-many').inputValue() === '149', width + ': a virtualised choice reaches the native form state');
    await p.evaluate(() => {
      const select = document.createElement('select'); select.id = 'ux-multi'; select.multiple = true; select.setAttribute('aria-label', 'Multi choices');
      ['First', 'Second', 'Third'].forEach(x => select.add(new Option(x, x))); document.querySelector('#main').append(select); window.LK_UX.enhance(document);
    });
    await p.locator('#ux-multi + .ux-picker-trigger').click();
    await p.locator('.ux-picker-option').nth(0).click(); await p.locator('.ux-picker-option').nth(1).click();
    ok(await p.locator('#ux-multi').evaluate(el => el.selectedOptions.length) === 0, width + ': multi-select edits remain a draft');
    await p.locator('.ux-picker-footer .dark').click();
    ok(await p.locator('#ux-multi').evaluate(el => el.selectedOptions.length) === 2, width + ': Apply commits the multi-select draft');
    ok(!(await L.overflow(p)) && p.errors.length === 0, width + ': no overflow or browser errors ' + p.errors.join('|'));
    await p.context().close();
  }
  const p = await L.open(b, '#/admin', { admin: true, adminPage: 'people', width: 1280, wait: 1400 });
  await L.adminTab(p, 'people');
  const header = p.locator('[data-lv="people"] [data-p="lv-col"]').first();
  await header.click(); ok(await header.locator('..').getAttribute('aria-sort') === 'ascending', 'admin: header starts with ascending sort');
  await header.click(); ok(await header.locator('..').getAttribute('aria-sort') === 'descending', 'admin: second click descends');
  await header.click(); ok(await header.locator('..').getAttribute('aria-sort') === 'none', 'admin: third click restores the default order');
  const q = p.locator('[data-k="lv-q:people"]'); await q.fill('ann'); await L.settle(p, 240);
  ok(await p.locator('[data-lvb="people"] tbody tr').count() === 1, 'admin: search filters complete list');
  await p.locator('[data-lva="people"] [data-part="all"]').click();
  ok(await q.inputValue() === '' && await p.locator('[data-lvb="people"] tbody tr').count() === 3, 'admin: Reset All Filters restores all rows and clears search');
  ok(p.errors.length === 0, 'admin: no browser errors ' + p.errors.join('|'));
  await p.context().close(); await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
