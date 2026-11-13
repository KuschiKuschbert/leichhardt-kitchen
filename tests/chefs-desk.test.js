// Real admin controls with synthetic data; no production reads or writes.
const L = require('./lib');
const { R, ok } = L.results();
(async () => {
 const browser = await L.start();
 for (const width of [390, 768, 1440]) {
  const p = await L.open(browser, '#/admin', { admin: true, who: '', width, wait: 1200 });
  for (const page of ['references', 'training', 'analysis', 'reference-records', 'notes', 'minutes', 'people', 'tools']) {
   await L.adminTab(p, page);
   ok(await p.locator('.a-chapter-heading h2').isVisible(), width + ': ' + page + ' has a visible chapter heading');
   ok(!(await L.overflow(p)), width + ': ' + page + ' fits the screen');
  }
  if (width === 1440) ok(await p.locator('.a-chapter-number').count() === 5, 'desktop has five numbered chapters');
  await L.adminTab(p, 'references');
  await p.click('[data-ai="new-reference"]');
  await p.locator('#ai-alias').fill('Example');
  if (width === 390) {
   const clear = await p.locator('.ai-save-actions').evaluate(el => {
    const r = el.getBoundingClientRect(), tabs = document.querySelector('.tabbar').getBoundingClientRect();
    return r.top >= 0 && r.bottom <= tabs.top + 2 && getComputedStyle(el).position === 'fixed';
   });
   ok(clear, 'phone save actions remain visible above kitchen navigation');
  }
  ok(!(await L.overflow(p)), width + ': focused editor fits the screen');
  if (process.env.LK_DESK_SCREENSHOTS) await p.screenshot({ path: require('node:path').join(process.env.LK_DESK_SCREENSHOTS, 'chefs-desk-' + width + '.png') });
  ok(p.errors.length === 0, width + ': no browser errors');
  await p.context().close();
 }
 await browser.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
