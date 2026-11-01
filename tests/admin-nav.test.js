// Grouped workspace navigation and retained admin pages.
const L = require('./lib'); const { R, ok } = L.results();
(async () => {
  const b = await L.start();
  for (const width of [390, 768, 1280]) {
    const p = await L.open(b, '#/admin', { admin: true, width, height: 900, wait: 1800 });
    const groups = await p.locator('.a-group').evaluateAll(nodes => nodes.map(el => el.getAttribute('data-g')));
    ok(JSON.stringify(groups) === JSON.stringify(['review', 'reports', 'records', 'today', 'settings']), width + ': five task-based admin sections');
    if (await p.locator('[data-k="ai-section"] + .ux-picker-trigger').isVisible()) await L.pick(p, '[data-k="ai-section"]', 'review');
    else await p.click('[data-g="review"]');
    ok(await p.locator('[data-t="references"]').count() === 1 && await p.locator('[data-t="training"]').count() === 1, width + ': Review desk offers item links and training');
    await L.adminTab(p, 'reference-records');
    ok(await p.locator('[data-g="records"][aria-current="page"]').count() === 1 && await p.locator('[data-t="training-records"]').count() === 1, width + ': confirmed links and assessments are together in Saved records');
    for (const tab of ['overview', 'references', 'training', 'reference-records', 'training-records', 'analysis', 'insights', 'team', 'waste', 'transfers', 'learning', 'people', 'tools', 'cutoffs', 'minutes', 'guides']) {
      await L.adminTab(p, tab);
      ok(await p.evaluate(t => LK_PREP.state.atab === t, tab), width + ': retained page id ' + tab);
    }
    await L.adminTab(p, 'insights'); await L.settle(p, 700);
    if (width >= 1100) {
      ok(await p.evaluate(() => document.querySelector('.a-nav').getBoundingClientRect().right <= document.querySelector('.a-pane').getBoundingClientRect().left), 'desktop sidebar sits beside report');
      await p.evaluate(() => scrollTo(0, 700)); await L.settle(p, 100);
      await L.adminTab(p, 'people');
      ok(await p.evaluate(() => scrollY < 5), 'desktop page change starts at the top');
    }
    ok(!(await L.overflow(p)), width + ': no sideways scroll');
    ok(p.errors.length === 0, width + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
