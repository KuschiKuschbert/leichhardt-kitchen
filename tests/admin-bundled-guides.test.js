// Bundled guides belong in the admin catalogue even when no guides have been uploaded.
const L = require('./lib');
const { R, ok } = L.results();
(async () => {
  const b = await L.start();
  const cfgKey = ['kitchens', L.PIN, 'config', 'main'].join('/');
  const cfg = L.seed()[cfgKey];
  cfg.people.find(p => p.id === 'sam').role = 'head'; cfg.headId = 'sam';
  for (const width of [390, 768, 1280]) {
    for (const who of ['', 'sam']) {
      const label = (who ? 'head chef and Google' : 'Google admin') + ' at ' + width;
      const p = await L.open(b, '#/admin', { admin: true, who, width, extra: { [cfgKey]: cfg }, wait: 1000 });
      await L.adminTab(p, 'guides');
      ok(await p.locator('.g-row').count() === 2, label + ': both bundled guides appear with no uploads');
      ok(await p.locator('.g-row [data-p="g-edit"], .g-row [data-p="g-del"]').count() === 0, label + ': no broken editing or removal controls');
      ok(await p.locator('.g-row').filter({ hasText: 'Included with the book' }).count() === 2, label + ': included guides are explained');
      for (const id of ['lk-2-hour-4-hour', 'lk-smoke-service']) {
        await p.click('.g-open[href="#/guides/' + id + '"]');
        await L.waitFor(p, () => !!document.querySelector('.g-doc'));
        ok(await p.locator('.g-doc a[download]').count() === 1, label + ': ' + id + ' opens with its PDF');
        ok(await p.locator('[data-p="g-change"]').count() === 0, label + ': ' + id + ' stays read only');
        await p.goto(L.BASE + '#/admin'); await L.adminTab(p, 'guides');
      }
      ok(!(await L.overflow(p)), label + ': no sideways scroll');
      ok(await p.evaluate(() => !Object.keys(window.__fake.dump()).some(k => /\/guides\//.test(k))), label + ': opening bundled guides creates no database records');
      ok(p.errors.length === 0, label + ': no browser errors');
      await p.context().close();
    }
  }
  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
