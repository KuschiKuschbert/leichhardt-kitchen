// Grouped workspace navigation and retained admin pages.
const L = require('./lib'); const { R, ok } = L.results();
(async () => {
  const b = await L.start();
  for (const width of [390, 768, 1280]) {
    const p = await L.open(b, '#/admin', { admin: true, width, height: 900, wait: 1800 });
    const groups = await p.locator('.a-group').evaluateAll(nodes => nodes.map(el => el.getAttribute('data-g')));
    ok(JSON.stringify(groups) === JSON.stringify(['today', 'reports', 'team', 'kitchen']), width + ': four rooms: Today, Reports, Team and Kitchen (' + groups.join(', ') + ')');
    ok(await p.locator('.a-groups').isVisible() && await p.locator('[data-k="ai-section"]').count() === 0, width + ': the rooms are buttons at every width, with no section picker');
    await p.click('[data-g="today"]'); await L.settle(p, 200);
    ok(await p.locator('[data-t="dashboard"]').count() === 1 && await p.locator('[data-t="references"]').count() === 1 && await p.locator('[data-t="training"]').count() === 1, width + ': Today offers the Dashboard, item links and training');
    await L.adminTab(p, 'reference-records');
    ok(await p.locator('[data-g="kitchen"][aria-current="page"]').count() === 1 && await p.locator('[data-t="tools"]').count() === 1, width + ': confirmed links sit in Kitchen with Backup and PIN');
    await L.adminTab(p, 'training-records');
    ok(await p.locator('[data-g="team"][aria-current="page"]').count() === 1 && await p.locator('[data-t="people"]').count() === 1, width + ': assessments sit in Team with People');
    for (const tab of ['references', 'training', 'reference-records', 'training-records', 'analysis', 'insights', 'team', 'waste', 'transfers', 'learning', 'people', 'tools', 'cutoffs', 'minutes', 'guides']) {
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
    // a phone that last had the Review desk's old landing page ('overview') opens Today on the item links
    const q = await L.open(b, '#/admin', { admin: true, adminPage: 'overview', width, height: 900, wait: 1800 });
    ok(await q.evaluate(() => LK_PREP.state.atab) === 'overview' && await q.locator('[data-g="today"][aria-current="page"]').count() === 1 && await q.locator('[data-t="references"][aria-pressed="true"]').count() === 1, width + ': the retained page id overview opens Today on Item links');
    await q.context().close();
  }
  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
