const L = require('./lib');
const { R, ok } = L.results();
(async () => {
  const b = await L.start();
  for (const width of [390, 768, 1280]) {
    const p = await L.open(b, '#/recipes', { width, wait: 1200 });
    const input = p.locator('#find');
    await input.fill('chicken'); await L.settle(p, 250);
    await input.blur(); await input.focus();
    const explanation = await input.evaluate(el => (el.getAttribute('aria-describedby') || '').split(/\s+/).map(id => document.getElementById(id)).filter(Boolean).filter(n => !n.hidden).map(n => n.textContent).join(' '));
    ok(explanation.includes('chicken') && /2|two/.test(explanation), width + ': retained results have a persistent accessible search explanation');
    ok(await input.inputValue() === '' && await input.getAttribute('data-committed-query') === 'chicken', width + ': refocus still preserves the committed query and clears only the draft');
    await input.locator('..').locator('.ux-search-clear').click(); await L.settle(p, 200);
    await p.evaluate(() => {
      document.documentElement.setAttribute('data-text', 'xlarge');
      const box = document.createElement('div'); box.id = 'council-fixtures';
      box.innerHTML = '<label>Recipe size<select id="council-size"><option>First</option><option>Second</option><option selected>Third</option></select></label>';
      const select = document.createElement('select'); select.id = 'council-many'; select.setAttribute('aria-label', 'Ingredients');
      for (let i = 0; i < 160; i++) select.add(new Option('Choice ' + i + ': roasted vegetables with coriander, lemon dressing and toasted pumpkin seeds for the evening service', String(i)));
      select.value = '149'; box.append(select); document.querySelector('#main').append(box); LK_UX.enhance(document);
    });
    const trigger = p.locator('#council-size-picker');
    ok((await trigger.getAttribute('aria-label')).includes('Third'), width + ': the trigger accessible name includes its current choice');
    await trigger.click();
    ok(await p.evaluate(() => document.activeElement.dataset.v === 'Third'), width + ': compact picker opens with focus on its selected option');
    await p.keyboard.press('ArrowUp');
    ok(await p.evaluate(() => document.activeElement.dataset.v === 'Second'), width + ': the first arrow moves from the focused selection');
    await p.keyboard.press('Escape'); await L.settle(p, 180);
    await p.locator('#council-many-picker').click();
    const selected = p.locator('.ux-picker-option[data-v="149"]');
    ok(await selected.count() === 1 && await selected.isVisible(), width + ': a selected option beyond the first virtual window is rendered on opening');
    ok(await p.evaluate(() => { const el = document.querySelector('.ux-picker-option[data-v="149"]'), container = el && el.closest('.ux-picker-options'); if (!container) return false; const row = el.getBoundingClientRect(), list = container.getBoundingClientRect(); return row.top >= list.top - 1 && row.bottom <= list.bottom + 1; }), width + ': the selected long option fits fully inside the opening list viewport');
    const readable = await p.locator('.ux-picker-option').evaluateAll(nodes => nodes.every(el => el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1));
    ok(readable, width + ': long virtualised labels remain fully readable at the largest text size');
    await p.keyboard.press('ArrowDown');
    ok(await p.evaluate(() => document.activeElement.dataset.v === '150'), width + ': keyboard navigation reaches the next virtual option');
    await p.keyboard.press('End');
    ok(await p.evaluate(() => document.activeElement.dataset.v === '159'), width + ': End reaches the last virtual option');
    await p.keyboard.press('Enter'); await L.settle(p, 200);
    ok(await p.locator('#council-many').inputValue() === '159', width + ': a long virtual option commits through the original field');
    if (width === 390) {
      await p.evaluate(() => {
        const host = document.createElement('div'); host.id = 'council-redraw'; document.querySelector('#main').append(host);
        function redraw(value, restoring) {
          const previous = host.querySelector('input'), active = previous && previous === document.activeElement;
          const start = active ? previous.selectionStart : null, end = active ? previous.selectionEnd : null;
          if (previous) previous.blur();
          host.replaceChildren(); const input = document.createElement('input'); input.id = 'council-redraw-query'; input.type = 'search'; input.value = value; host.append(input);
          LK_UX.SmartSearchBar(input, { onQuery: redraw });
          if (active) { if (restoring && LK_UX.restoreFocus) LK_UX.restoreFocus(input); else input.focus(); input.setSelectionRange(start, end); }
        }
        host._redraw = redraw;
        redraw('');
      });
      const redrawn = p.locator('#council-redraw-query');
      await redrawn.fill('Milk'); await L.settle(p, 230);
      ok(await redrawn.evaluate(el => document.activeElement === el && el.value === 'Milk'), 'phone: a synchronous search redraw retains typing focus and the visible draft');
      await redrawn.evaluate(el => { el.value = 'Milk'; el.setSelectionRange(1, 3); document.querySelector('#council-redraw')._redraw('Milk', true); });
      ok(await redrawn.evaluate(el => document.activeElement === el && el.value === 'Milk' && el.selectionStart === 1 && el.selectionEnd === 3), 'phone: an unrelated redraw restores the focused query and cursor');
      await redrawn.blur(); await redrawn.focus();
      ok(await redrawn.inputValue() === '' && await redrawn.getAttribute('data-committed-query') === 'Milk', 'phone: real refocus after a redraw still clears only the draft');
      await redrawn.fill('Milk'); await L.settle(p, 230); await p.keyboard.press('Enter');
      ok(await redrawn.getAttribute('data-committed-query') === 'Milk' && await redrawn.inputValue() === 'Milk', 'phone: Enter after a deferred redraw retains the committed query');
      await redrawn.evaluate(el => { el.value = 'Chicken'; el.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('#council-redraw')._redraw(el.dataset.committedQuery, true); });
      await L.settle(p, 230);
      ok(await redrawn.evaluate(el => document.activeElement === el && el.value === 'Chicken' && el.dataset.committedQuery === 'Chicken'), 'phone: a pending draft still commits after an unrelated redraw');
      await p.locator('#council-redraw').evaluate(el => el.remove());
      await p.evaluate(() => LK_UX.AdaptivePicker({ managedOverlay: true, label: 'Focus review', value: ['0'], items: Array.from({ length: 160 }, (_, i) => ({ value: String(i), label: 'Choice ' + i })) }));
      await p.keyboard.press('ArrowDown');
      await p.locator('.ux-picker-options').evaluate(el => { el.scrollTop = 10000; }); await L.settle(p, 220);
      ok(await p.evaluate(() => !!document.activeElement.closest('.ux-picker')), 'phone: scrolling away from the focused virtual option retains modal focus');
      await p.keyboard.press('ArrowDown');
      ok(await p.evaluate(() => document.activeElement.dataset.v === '2'), 'phone: keyboard navigation resumes from the evicted option identity');
      await p.evaluate(() => LK_UX.close());
    }
    ok(!(await L.overflow(p)) && p.errors.length === 0, width + ': shared controls have no page overflow or browser errors');
    await p.context().close();
  }
  const p = await L.open(b, '#/admin', { admin: true, adminPage: 'people', width: 390, wait: 1200 });
  await p.evaluate(() => {
    const box = document.createElement('section'); box.id = 'council-report';
    box.innerHTML = '<div><table><thead><tr><th>Item</th><th>Status</th></tr></thead><tbody><tr><td><input aria-label="Item" value="Old value"></td><td>Open</td></tr><tr><td><select aria-label="Chosen item"><option>Hidden alternative</option><option selected>Vegetables</option></select></td><td>Done</td></tr></tbody></table></div>';
    document.querySelector('.p-admin').append(box); box.querySelector('input').value = 'Fresh coriander'; LK_UX.enhance(document);
  });
  const report = p.locator('#council-report'), search = report.locator('input[type="search"]');
  ok((await report.locator('[role="status"]').allTextContents()).some(s => s.includes('2 of 2')), 'report: the initial row count is visible and accessible');
  await search.fill('Fresh coriander'); await L.settle(p, 230);
  ok(await report.locator('tbody tr:not([hidden])').count() === 1, 'report: search uses current editable field values');
  await search.fill('Hidden alternative'); await L.settle(p, 230);
  ok(await report.locator('tbody tr:not([hidden])').count() === 0, 'report: unselected options do not produce false search matches');
  ok((await report.locator('[role="status"]').allTextContents()).some(s => s.includes('0 of 2')), 'report: zero results have an accessible count');
  const recovery = report.getByRole('button', { name: 'Clear search and filters', exact: true });
  ok(await recovery.count() === 1 && await recovery.isVisible(), 'report: a zero-result table offers an explicit recovery action');
  if (await recovery.count()) await recovery.click();
  ok(await report.locator('tbody tr:not([hidden])').count() === 2 && await search.inputValue() === '', 'report: recovery restores every row and clears the search');
  ok(!(await L.overflow(p)) && p.errors.length === 0, 'report: feedback has no phone overflow or browser errors');
  await p.context().close(); await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
