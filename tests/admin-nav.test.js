// Grouped workspace navigation and retained admin pages.
const L = require('./lib'); const { R, ok } = L.results();
(async () => {
  const b = await L.start();
  for (const width of [390, 768, 1280]) {
    const p = await L.open(b, '#/admin', { admin: true, width, height: 900, wait: 1800 });
    ok(await p.locator('.a-group').count() === 6, width + ': six admin sections');
    if (width < 720) await p.selectOption('[data-k="ai-section"]', 'training');
    else await p.click('[data-g="training"]');
    ok(await p.locator('[data-t="training"]').count() === 1, width + ': Training section opens');
    for (const tab of ['insights', 'team', 'waste', 'transfers', 'learning', 'people', 'tools', 'cutoffs', 'minutes', 'guides']) {
      await L.adminTab(p, tab);
      ok(await p.evaluate(t => LK_PREP.state.atab === t, tab), width + ': retained page id ' + tab);
    }
    await L.adminTab(p, 'insights'); await L.settle(p, 700);
    if (width >= 1100) ok(await p.evaluate(() => document.querySelector('.a-nav').getBoundingClientRect().right <= document.querySelector('.a-pane').getBoundingClientRect().left), 'desktop sidebar sits beside report');
    ok(!(await L.overflow(p)), width + ': no sideways scroll');
    ok(p.errors.length === 0, width + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
