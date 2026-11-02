// Growing admin lists sort complete, filtered data once, without parsing cells inside every comparison.
const L = require('./lib');
const { R, ok } = L.results();
const count = 240;
const scope = '[data-lv="council-records"]';
const rows = scope + ' tbody tr';
const ids = p => p.locator(rows + ' [data-record]').evaluateAll(nodes => nodes.map(el => +el.dataset.record));
const header = (p, col) => p.locator(scope + ' [data-p="lv-col"][data-col="' + col + '"]');
const reset = p => p.locator('[data-lva="council-records"] [data-part="all"]').click();
async function metrics(p) { return p.evaluate(() => ({ ...window.__councilTables.metrics })); }
async function clearMetrics(p) { await p.evaluate(() => { window.__councilTables.metrics = { parse: 0, numberHTML: 0, accessor: 0 }; }); }
async function matches(p, column, descending, filtered) {
  const expected = await p.evaluate(({ column, descending, filtered }) => {
    let items = window.__councilTables.items;
    if (filtered) items = items.filter(row => row.status === filtered);
    function value(row) { return column === 0 ? row.id : column === 1 ? row.amount : column === 2 ? row.date : column === 3 ? row.allowed : row.priority; }
    return items.slice().sort((a, b) => {
      const x = value(a), y = value(b);
      let result;
      if (x == null) result = y == null ? 0 : 1;
      else if (y == null) result = -1;
      else result = x < y ? -1 : x > y ? 1 : 0;
      return descending ? -result : result;
    }).slice(0, 15).map(row => row.id);
  }, { column, descending, filtered });
  return JSON.stringify(await ids(p)) === JSON.stringify(expected);
}
(async () => {
  const b = await L.start();
  const p = await L.open(b, '#/admin', { admin: true, adminPage: 'proofreader', width: 1280, wait: 1400 });
  await L.adminTab(p, 'proofreader');
  await L.waitFor(p, () => !!window.LK_PROOFREADER && !!document.querySelector('.pr-workspace'), null, 8000);
  await L.waitFor(p, () => {
    const s = LK_PREP.state;
    return s.stats && !s.stats.loading && s.ordStats && !s.ordStats.loading;
  }, null, 8000);
  await L.settle(p, 400);
  // Use the real list adapter provided to the lazy admin module. No production test hooks or Firestore fixture reads.
  await p.evaluate(count => {
    const test = window.__councilTables = { items: [], metrics: { parse: 0, numberHTML: 0, accessor: 0 } };
    for (let i = 0; i < count; i++) {
      const id = (i * 97) % count + 1;
      test.items.push({ id, name: 'Record ' + String(id).padStart(3, '0'), amount: id % 17 ? id % 31 : null,
        date: new Date(Date.UTC(2026, 11, 20 + id % 24)).toISOString().slice(0, 10),
        allowed: id % 3 === 0, status: id % 2 ? 'Waiting' : 'Ready', priority: id % 11 });
    }
    const original = LK_UX.cellValue;
    LK_UX.cellValue = function (html) { test.metrics.parse++; return original(html); };
    const config = { key: 'council-records', items: test.items, step: 15, noun: ['record', 'records'],
      find: row => row.name, filters: [['all', 'All records'], ['even', 'Even records', row => row.id % 2 === 0]],
      cols: [
        { h: 'Record', html: row => '<span data-record="' + row.id + '" data-sort-value="' + row.id + '">' + row.name + '</span>' },
        { h: 'Amount', html: row => { test.metrics.numberHTML++; return row.amount == null ? '' : '<strong>' + row.amount + '</strong>'; } },
        { h: 'Recorded', html: row => '<time data-sort-value="' + row.date + '">' + row.date + '</time>' },
        { h: 'Write', html: row => '<input type="checkbox" disabled' + (row.allowed ? ' checked' : '') + '>' },
        { h: 'Status', html: row => row.status },
        { h: 'Priority', value: row => { test.metrics.accessor++; return row.priority; }, html: row => 'Priority ' + row.priority }
      ] };
    test.config = config;
    LK_PROOFREADER.render = adapter => '<section id="council-tables">' + adapter.listHTML(config) + '</section>';
  }, count);
  await L.adminTab(p, 'proofreader');
  await L.waitFor(p, () => !!document.querySelector('#council-tables tbody'), null, 4000);
  const billedBefore = await p.evaluate(() => window.__fake.bill.reduce((n, x) => n + x.n, 0));
  ok(await p.locator(rows).count() === 15, '240-record fixture starts with a 15-row page');

  await clearMetrics(p);
  await header(p, 1).click();
  const ascending = await metrics(p);
  console.log('240-row numeric sort: ' + ascending.parse + ' cell parses, ' + ascending.numberHTML + ' amount renders');
  ok(ascending.parse === count && ascending.numberHTML === count + 15, 'numeric sort derives one key per record, plus the 15 displayed cells (' + ascending.parse + ' parses, ' + ascending.numberHTML + ' renders)');
  ok(await matches(p, 1, false), 'numeric sort covers all 240 records before pagination and preserves tied source order');
  await header(p, 1).click();
  ok(await matches(p, 1, true), 'descending numeric sort preserves the existing empty-first policy and stable ties');
  await header(p, 1).click();
  ok((await ids(p)).join(',') === await p.evaluate(() => __councilTables.items.slice(0, 15).map(row => row.id).join(',')), 'third header click restores source order');

  await header(p, 2).click();
  ok(await matches(p, 2, false), 'date keys sort December before the following January across the full list');
  await header(p, 3).click();
  ok(await matches(p, 3, false), 'unchecked boolean values sort before checked values without losing stable ties');
  await clearMetrics(p);
  await header(p, 5).click();
  const custom = await metrics(p);
  ok(custom.accessor === count && custom.parse === 0, 'explicit typed accessor runs once per record and avoids HTML parsing (' + custom.accessor + ' calls)');
  ok(await matches(p, 5, false), 'explicit accessor controls ordering rather than its displayed wording');

  await reset(p);
  await L.pick(p, '[data-k="lv-cf:council-records"]', 'Ready');
  await clearMetrics(p);
  await header(p, 1).click();
  const filtered = await metrics(p);
  ok(filtered.parse === count + count / 2 && filtered.numberHTML === count / 2 + 15, 'facet filtering runs before key extraction for the remaining 120 records (' + filtered.numberHTML + ' amount renders)');
  ok(await matches(p, 1, false, 'Ready'), 'categorical filtering and sorting cover every matching record before pagination');
  await p.locator(scope + ' [data-p="lv-more"]').click();
  ok(await p.locator(rows).count() === 30, 'Show more adds the next page of filtered, sorted records');
  const q = p.locator('[data-k="lv-q:council-records"]');
  await q.fill('Record 00'); await q.press('Enter');
  ok(await p.locator(rows).count() === 6 && (await ids(p)).every(id => [2, 4, 6, 8, 100, 200].includes(id)), 'search intersects the category filter and returns to the first page');
  await q.fill('No matching record'); await q.press('Enter');
  ok(await p.locator(scope + ' .lv-none').count() === 1, 'empty filtered search offers a recovery action');
  await p.locator(scope + ' [data-p="lv-clear"]').click();
  ok(await p.locator(rows).count() === 15 && await q.inputValue() === '' && await p.locator('[data-k="lv-cf:council-records"]').inputValue() === '', 'empty-state recovery clears search and category filters and restores the first page');
  await reset(p);
  ok((await ids(p)).join(',') === await p.evaluate(() => __councilTables.items.slice(0, 15).map(row => row.id).join(',')) && await p.locator('[data-lva="council-records"] button').count() === 0, 'Reset All restores source order and removes every active badge');

  await header(p, 1).click();
  await p.evaluate(() => { __councilTables.items[0].amount = 999; });
  await clearMetrics(p);
  await header(p, 1).click();
  ok((await ids(p)).includes(await p.evaluate(() => __councilTables.items[0].id)) && await matches(p, 1, true), 'sorting derives fresh keys after an existing record changes');
  ok((await metrics(p)).parse === count, 'fresh-key derivation still parses each source record only once');
  const billedAfter = await p.evaluate(() => window.__fake.bill.reduce((n, x) => n + x.n, 0));
  ok(billedAfter === billedBefore, 'sort, filter, pagination and resets add zero Firestore reads');
  await L.adminTab(p, 'people');
  const personIndex = await p.evaluate(() => {
    const s = LK_PREP.state;
    for (let i = s.draft.people.length; i < 10; i++) s.draft.people.push({ id: 'council-' + i, name: 'Council person ' + i, role: 'staff', active: true, isNew: true });
    LK_PREP.mount('admin', s.root);
    return s.draft.people.length;
  });
  await L.waitFor(p, () => !!document.querySelector('[data-k="lv-q:people"]'));
  const peopleReads = await p.evaluate(() => __fake.bill.reduce((n, x) => n + x.n, 0));
  await p.evaluate(() => {
    const input = document.querySelector('[data-k="lv-q:people"]');
    input.value = 'Sam'; input.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('[data-p="a-add-person"]').click();
  });
  await L.settle(p, 300);
  ok(await p.locator('[data-k="lv-q:people"]').getAttribute('data-committed-query') === '', 'revealing a newly added row cancels a pending list search');
  ok(await p.evaluate(i => { const el = document.querySelector('[data-k="a-n' + i + '"]'); return !!el && !!el.getClientRects().length && el === document.activeElement; }, personIndex), 'the newly added person remains visible and focused after the debounce');
  ok(await p.evaluate(() => __fake.bill.reduce((n, x) => n + x.n, 0)) === peopleReads, 'revealing a draft person adds no Firestore reads');
  ok(p.errors.length === 0, 'admin table journeys have no browser errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
