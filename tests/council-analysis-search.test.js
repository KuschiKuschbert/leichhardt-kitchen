// Analysis has one committed search and one reset path through its queue.
const L = require('./lib'), C = require('../js/analysis-core');
const { R, ok } = L.results();
const day = L.ymd(new Date(L.NOW - 86400000));
const daily = C.daily(day, { prep: [
  { id: 'milk', text: 'Milk', station: 'Grill' },
  { id: 'chicken', text: 'Chicken', station: 'Grill' },
  { id: 'herbs', text: 'Mushroom  sauce', station: 'Grill' }
] }, []);
const aggregate = C.aggregate([daily]);
const path = name => ['kitchens', L.PIN, 'analysis', name].join('/');
const extra = {
  [path('current')]: { generation: 'council', at: L.NOW, from: day, to: day, days: 1 },
  [path('health')]: { status: 'ok', at: L.NOW }
};
for (const range of [7, 30, 90]) extra[path('range-' + range)] = {
  ...aggregate, generation: 'council', at: L.NOW, from: day, to: day, days: 1,
  dates: [{ day, counts: daily.counts }], totalItems: aggregate.items.length
};
async function search(p, selector, value) {
  await p.fill(selector, value); await p.press(selector, 'Enter');
  await L.waitFor(p, ({ selector, value }) => document.querySelector(selector)?.dataset.committedQuery === value.trim(), { selector, value });
  await L.settle(p, 100);
}
(async () => {
  const b = await L.start();
  for (const width of [390, 768, 1280]) {
    const p = await L.open(b, '#/admin', { admin: true, who: '', width, extra });
    await L.adminTab(p, 'analysis');
    await L.waitFor(p, () => document.querySelectorAll('[data-ai="item"]').length === 3);
    ok(await p.locator('.ai-queue .ux-search').count() === 1, width + ': recorded items offer one search box');
    await p.fill('#record-q-analysis-items', 'Milk');
    await L.waitFor(p, () => document.querySelector('#record-q-analysis-items')?.dataset.committedQuery === 'Milk');
    ok(await p.evaluate(() => document.activeElement.id === 'record-q-analysis-items' && document.activeElement.value === 'Milk'), width + ': deferred filtering retains typing focus and the entered query');
    await p.keyboard.press('Enter');
    ok(await p.locator('#record-q-analysis-items').getAttribute('data-committed-query') === 'Milk' && await p.locator('[data-ai="item"]').count() === 1, width + ': Enter after deferred filtering keeps the committed results');
    await p.locator('#record-q-analysis-items').blur();
    await p.fill('#record-q-analysis-items', 'C');
    await p.evaluate(() => LK_PREP.mount('admin', LK_PREP.state.root));
    ok(await p.evaluate(() => document.activeElement.id === 'record-q-analysis-items' && document.activeElement.value === 'C' && document.activeElement.dataset.committedQuery === 'Milk'), width + ': an unrelated redraw retains a one-character replacement draft');
    await p.locator('#record-q-analysis-items').blur();
    ok(await p.locator('#record-q-analysis-items').inputValue() === 'Milk', width + ': an intentional blur still restores the committed query');
    await p.locator('#record-q-analysis-items').locator('..').locator('.ux-search-clear').click();
    await p.locator('[data-record="analysis-items"] summary').click();
    await p.locator('[data-record-sort="analysis-items"][data-column="name"]').click();
    await p.evaluate(() => {
      const input = document.querySelector('#record-q-analysis-items');
      input.value = 'Milk'; input.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('[data-record-reset="analysis-items"][data-part="all"]').click();
    });
    await L.settle(p, 300);
    ok(await p.locator('#record-q-analysis-items').getAttribute('data-committed-query') === '' && await p.locator('[data-ai="item"]').count() === 3, width + ': Reset All cancels a pending search as well as the active sort');
    const reads = await p.evaluate(() => __fake.bill.reduce((n, x) => n + x.n, 0));
    // On the old screen these two inputs could contradict each other.
    if (await p.locator('#ai-search').count()) await search(p, '#ai-search', 'Chicken');
    await search(p, '#record-q-analysis-items', 'Milk');
    await p.locator('[data-record-reset="analysis-items"][data-part="all"]').click();
    await L.settle(p, 100);
    ok(await p.locator('[data-ai="item"]').count() === 3, width + ': Reset All Filters recovers the whole item list');
    if (await p.locator('#ai-search').count()) await search(p, '#ai-search', '');
    await search(p, '#record-q-analysis-items', 'Milk');
    await L.waitFor(p, () => document.querySelectorAll('[data-ai="item"]').length === 1 && document.querySelector('.ai-row-title')?.textContent === 'Milk');
    ok(await p.locator('[data-ai="item"]').count() === 1 && await p.locator('.ai-row-title').first().textContent() === 'Milk', width + ': one search narrows the item queue');
    ok(await p.evaluate(() => __fake.bill.reduce((n, x) => n + x.n, 0)) === reads, width + ': local search and reset add no document reads');
    await p.locator('[data-ai="item"]').click(); await p.click('.wtop [data-act="back"]');
    ok(await p.locator('#record-q-analysis-items').getAttribute('data-committed-query') === 'Milk' && await p.locator('[data-ai="item"]').count() === 1, width + ': contextual Back keeps the committed search');
    await p.locator('#record-q-analysis-items').locator('..').locator('.ux-search-clear').click();
    ok(await p.locator('[data-ai="item"]').count() === 3, width + ': Clear search recovers the complete queue');
    await search(p, '#record-q-analysis-items', 'MUSHROOM sauce');
    ok(await p.locator('[data-ai="item"]').count() === 1 && (await p.locator('.ai-row-title').allTextContents()).includes('Mushroom  sauce'), width + ': search preserves case and whitespace normalisation');
    await p.context().close();
  }
  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
