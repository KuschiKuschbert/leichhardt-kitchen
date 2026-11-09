// Explicit catalogue splits retain live item identity and project earlier combined orders without rewriting them.
// Suppliers, products, people and delivery dates in this file are synthetic.
const L = require('./lib');
const F = require('./supplier-fixtures');
const { R, ok } = L.results();
const SOURCE = 'northside', TARGET = 'northside-separate';
const sourceKey = F.key(['suppliers', SOURCE]), targetKey = F.key(['suppliers', TARGET]);
const movedIds = ['t-case', 't-stock'];
const clone = value => JSON.parse(JSON.stringify(value));
const qty = id => 'input[data-sf="qty"][data-i="' + id + '"]';
const stock = id => 'input[data-sf="stock"][data-i="' + id + '"]';
const action = (page, name) => L.choose(page, '[data-su="' + name + '"]');
const dump = page => page.evaluate(() => window.__fake.dump());
const supplierRecords = value => JSON.stringify(Object.entries(value).filter(([key]) => /\/suppliers(?:\/|$)|\/supplierlinks\//.test(key)).sort(([a], [b]) => a.localeCompare(b)));
const historicalRecords = value => JSON.stringify(Object.entries(value).filter(([key]) => /\/suppliers\/[^/]+\/orders\//.test(key)).sort(([a], [b]) => a.localeCompare(b)));
function fixture(patch) {
  const extra = clone(F.fixture());
  extra[sourceKey].items[0].par = '19.50';
  extra[sourceKey].items[0].aliases = ['Current stock matching name'];
  delete extra[sourceKey].items[3].aliases;
  extra[F.key(['config', 'main'])].cutoffs.push({ id: TARGET, name: 'Northside Test Seafood', dd: [(new Date(L.NOW).getDay() + 3) % 7], at: 11 * 60, pre: 1, lead: 180 });
  return Object.assign(extra, patch || {});
}
function payload() {
  const original = clone(F.fixture()[sourceKey]);
  return { version: 1, suppliers: [
    { id: SOURCE, name: 'Northside Test Dry Goods', cutoffId: SOURCE, items: original.items.filter(item => !movedIds.includes(item.id)) },
    { id: TARGET, name: 'Northside Test Seafood', cutoffId: TARGET, splitFrom: SOURCE, items: movedIds.map(id => original.items.find(item => item.id === id)) }
  ] };
}
async function open(browser, width, extra, who) {
  const page = await L.open(browser, '#/suppliers/' + SOURCE, { who: who || 'bo', width: width || 390, extra: extra || fixture(), wait: 1400 });
  await L.waitFor(page, () => !!document.querySelector('input[data-sf="qty"]'), null, 15000);
  return page;
}
async function previewCatalogue(page, incoming) {
  await action(page, 'manage');
  await page.setInputFiles('[data-sf="import"]', { name: 'synthetic-split-catalogue.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(incoming || payload())) });
  await L.waitFor(page, () => /Review catalogue import/.test(document.querySelector('#rtitle')?.textContent || ''), null, 5000);
}
async function importThroughUI(page, incoming) {
  await previewCatalogue(page, incoming);
  await action(page, 'import-apply');
  await L.waitFor(page, key => !!window.__fake.dump()[key] && !document.querySelector('[data-su="import-apply"]'), targetKey, 12000);
}
async function selectSupplier(page, id) {
  const side = page.locator('[data-su="pick"][data-sid="' + id + '"]');
  if (await side.isVisible()) await side.click();
  else await L.pick(page, '[data-sf="supplier"]', id);
  await L.waitFor(page, sid => document.querySelector('[data-sf="supplier"]')?.value === sid && !!document.querySelector('input[data-sf="qty"]'), id, 10000);
}
async function splitDirect(page, value) {
  return page.evaluate(async incoming => {
    const store = window.LK_SUP_STORE.create(window.LK_PREP.supplier());
    window.__splitStore = store;
    await store.loadSuppliers();
    return store.importCatalogue(incoming, { northside: 'northside', 'northside-separate': 'northside-separate' });
  }, value || payload());
}
async function refusal(page, value) {
  return page.evaluate(async incoming => {
    try { await window.LK_SUP_STORE.create(window.LK_PREP.supplier()).importCatalogue(incoming); return 'saved'; }
    catch (error) { return error.code || 'refused'; }
  }, value);
}

(async () => {
  const browser = await L.start();
  let page;
  for (const width of [390, 768, 1280]) {
    page = await open(browser, width);
    const before = await dump(page);
    await page.fill(qty('t-stock'), '7 kg'); await page.fill(stock('t-stock'), '3 kg');
    await importThroughUI(page);
    const after = await dump(page), source = after[sourceKey], target = after[targetKey];
    ok(source.v === 2 && target.v === 1, width + ': split creates one source revision and one target catalogue');
    ok(source.items.length === before[sourceKey].items.length && movedIds.every(id => source.items.find(item => item.id === id)?.archived), width + ': source retains moved IDs as archived records rather than deleting them');
    ok(before[sourceKey].items.every(item => JSON.stringify(source.items.find(current => current.id === item.id)) === JSON.stringify(movedIds.includes(item.id) ? { ...item, archived: true } : item)), width + ': archiving is the only change to raw source item maps');
    ok(target.items.map(item => item.id).join() === movedIds.join() && target.items.every(item => JSON.stringify(item) === JSON.stringify(before[sourceKey].items.find(old => old.id === item.id))), width + ': target keeps exact current item maps, IDs, units and live pars in file order');
    ok(source.name === 'Northside Test Dry Goods' && target.name === 'Northside Test Seafood' && source.cutoffId === SOURCE && target.cutoffId === TARGET, width + ': each supplier has its reviewed label and independent order reminder');
    ok(target.historyFrom === SOURCE && target.historyBefore === target.at && source.at === target.at && source.by === target.by, width + ': immutable history anchor uses the atomic split timestamp');
    ok(after[sourceKey + '/audit/2']?.at === source.at && after[targetKey + '/audit/1']?.at === target.at && after[sourceKey + '/audit/2']?.by === target.by && after[targetKey + '/audit/1']?.by === target.by, width + ': both catalogues have paired audits from the same split');
    ok(historicalRecords(after) === historicalRecords(before), width + ': original combined orders and their quantities are byte-for-byte unchanged');
    await action(page, 'order-mode'); await selectSupplier(page, TARGET);
    await L.waitFor(page, () => document.querySelector('input[data-sf="qty"][data-i="t-stock"]')?.placeholder === '2 kg', null, 10000);
    ok(await page.inputValue(qty('t-stock')) === '7 kg' && await page.inputValue(stock('t-stock')) === '3 kg', width + ': moved typed quantities and stock stay with their IDs on the separate supplier draft');
    ok(await page.$eval(qty('t-stock'), element => element.placeholder) === '2 kg' && /1 case/.test(await L.txt(page, '[data-item="t-case"] .su-last')), width + ': previous item quantities are inherited from the original combined order');
    ok((await page.$$eval('.su-row', rows => rows.map(row => row.dataset.item))).join() === movedIds.join(), width + ': separate order sheet shows only its own active items');
    ok(!(await L.overflow(page)) && page.errors.length === 0, width + ': separate supplier sheet fits without page errors');
    await page.context().close();
  }

  const groupedFixture = fixture(), caseName = F.items.find(item => item.id === 't-case').name;
  groupedFixture[F.key(['config', 'main'])].cutoffs.find(cutoff => cutoff.id === TARGET).dd = [(new Date(L.NOW).getDay() + 1) % 7];
  groupedFixture[F.key(['orders', F.today, 'lines', 'moved-product-request'])] = { text: caseName, qty: '1 case', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 1800000, ordered: false, deleted: false };
  page = await L.open(browser, '#/orders', { who: 'bo', extra: groupedFixture, wait: 1600 });
  await L.waitFor(page, name => Array.from(document.querySelectorAll('.o-sups .o-sup')).some(group => /Northside Test Foods/.test(group.querySelector('.cut-n')?.textContent || '') && Array.from(group.querySelectorAll('.nb-t')).some(line => line.textContent.includes(name))), caseName, 10000);
  ok(await page.evaluate(name => Array.from(document.querySelectorAll('.o-sups .o-sup')).some(group => /Northside Test Foods/.test(group.querySelector('.cut-n')?.textContent || '') && Array.from(group.querySelectorAll('.nb-t')).some(line => line.textContent.includes(name))), caseName), 'Orders initially groups the moved product under the original supplier from its loaded catalogue');
  await page.evaluate(source => { window.__ordersCacheMarker = true; location.hash = '#/suppliers/' + source; }, SOURCE);
  await L.waitFor(page, () => !!document.querySelector('input[data-sf="qty"]'), null, 10000);
  await L.settle(page, 300);
  await splitDirect(page);
  await page.evaluate(() => { window.__fake.bill.length = 0; location.hash = '#/orders'; });
  await L.waitFor(page, name => Array.from(document.querySelectorAll('.o-sups .o-sup')).some(group => /Northside Test Seafood/.test(group.querySelector('.cut-n')?.textContent || '') && Array.from(group.querySelectorAll('.nb-t')).some(line => line.textContent.includes(name))), caseName, 10000).catch(() => {});
  const groupedAfterSplit = await page.evaluate(name => ({
    samePage: window.__ordersCacheMarker === true,
    queryCount: window.__fake.bill.filter(entry => entry.kind === 'lite-query' && /\/suppliers$/.test(entry.path)).length,
    originalHasMoved: Array.from(document.querySelectorAll('.o-sups .o-sup')).some(group => /Northside Test Foods/.test(group.querySelector('.cut-n')?.textContent || '') && Array.from(group.querySelectorAll('.nb-t')).some(line => line.textContent.includes(name))),
    targetHasMoved: Array.from(document.querySelectorAll('.o-sups .o-sup')).some(group => /Northside Test Seafood/.test(group.querySelector('.cut-n')?.textContent || '') && Array.from(group.querySelectorAll('.nb-t')).some(line => line.textContent.includes(name)))
  }), caseName);
  ok(groupedAfterSplit.samePage && !groupedAfterSplit.originalHasMoved && groupedAfterSplit.targetHasMoved && groupedAfterSplit.queryCount === 1, 'an acknowledged split refreshes Orders once and groups the moved product under its separate reminder without reloading');
  await page.evaluate(source => { location.hash = '#/suppliers/' + source; }, SOURCE);
  await L.waitFor(page, () => !!document.querySelector('input[data-sf="qty"]'), null, 10000);
  await L.settle(page, 300);
  await page.evaluate(async target => {
    const store = window.__splitStore, supplier = await store.load(target);
    window.__fake.bill.length = 0;
    await store.record(target, supplier.v, 'group-cache-record', window.LK_SUP_CORE.snapshotLines(supplier.items, { 't-stock': '3 kg' }), null, 0, false, '');
    location.hash = '#/orders';
  }, TARGET);
  await L.waitFor(page, name => Array.from(document.querySelectorAll('.o-sups .o-sup')).some(group => /Northside Test Seafood/.test(group.querySelector('.cut-n')?.textContent || '') && Array.from(group.querySelectorAll('.nb-t')).some(line => line.textContent.includes(name))), caseName, 10000).catch(() => {});
  ok(await page.evaluate(() => window.__ordersCacheMarker === true && window.__fake.bill.filter(entry => entry.kind === 'lite-query' && /\/suppliers$/.test(entry.path)).length === 0), 'recording an order keeps the refreshed Orders catalogue cache and adds no catalogue query');
  await page.context().close();

  for (const supplied of ['', 'unconfigured-reminder']) {
    const matching = fixture(), incoming = payload();
    incoming.suppliers[1].cutoffId = supplied;
    incoming.suppliers[1].name = '  NORTHSIDE   TEST seafood  ';
    matching[F.key(['config', 'main'])].cutoffs.push({ id: 'source-name-decoy', name: incoming.suppliers[0].name, dd: [1], at: 600, pre: 1, lead: 60 });
    page = await open(browser, 390, matching);
    await previewCatalogue(page, incoming);
    const sourceMapping = await page.inputValue('[data-sf="import-cutoff"][data-sid="' + SOURCE + '"]'), targetMapping = await page.inputValue('[data-sf="import-cutoff"][data-sid="' + TARGET + '"]');
    ok(sourceMapping === SOURCE && targetMapping === TARGET, 'a new supplier with ' + (supplied ? 'an unconfigured' : 'no') + ' supplied reminder uses its unique exact name match while an existing supplier keeps its own link');
    if (!supplied) {
      await action(page, 'import-apply');
      await L.waitFor(page, key => !!window.__fake.dump()[key], targetKey, 10000);
      const mapped = await dump(page);
      ok(mapped[sourceKey].cutoffId === SOURCE && mapped[targetKey].cutoffId === TARGET, 'the reviewed reminder defaults save independent source and target links with the split');
    }
    await page.context().close();
  }
  for (const variant of ['ambiguous', 'different-name']) {
    const matching = fixture(), incoming = payload();
    incoming.suppliers[1].cutoffId = '';
    if (variant === 'ambiguous') matching[F.key(['config', 'main'])].cutoffs.push({ id: 'duplicate-seafood-reminder', name: 'NORTHSIDE  TEST SEAFOOD', dd: [2], at: 600, pre: 1, lead: 60 });
    else incoming.suppliers[1].name = 'Northside Test Frozen Seafood';
    page = await open(browser, 390, matching);
    await previewCatalogue(page, incoming);
    ok(await page.inputValue('[data-sf="import-cutoff"][data-sid="' + TARGET + '"]') === '', 'a new supplier with ' + variant + ' reminder names stays unlinked for explicit review');
    await page.context().close();
  }

  page = await open(browser);
  await splitDirect(page);
  const before = await dump(page), splitAt = before[targetKey].historyBefore;
  const direct = await page.evaluate(async ({ source, target, sourceKey, targetKey, sourceAt, incoming }) => {
    const store = window.__splitStore, C = window.LK_SUP_CORE, bridge = window.LK_PREP.supplier();
    window.__fake.bill.length = 0;
    const inherited = await store.history(target, 1);
    const inheritedReads = window.__fake.bill.filter(entry => entry.kind === 'lite-query' && /\/orders$/.test(entry.path));
    const original = window.__fake.dump()[sourceKey + '/orders/previous'];
    const dry = window.__fake.dump()[sourceKey].items.find(item => item.id === 't-zero');
    window.__fake.dump()[sourceKey + '/orders/later-dry-order'] = { ...original, at: sourceAt + 1000, lines: [{ itemId: dry.id, name: dry.name, pack: dry.pack, qty: '8', amount: 8, unit: '', par: dry.par, parUnit: dry.parUnit, source: dry.source, suggestion: '', stock: '' }] };
    const stillInherited = await store.history(target, 1);
    const targetCatalogue = await store.load(target), sourceCatalogue = await store.load(source);
    const boundaryAts = [];
    for (const [index, clock] of [sourceAt, sourceAt - 1000].entries()) {
      const id = 'later-dry-boundary-' + index;
      try {
        await window.LK_SUP_STORE.create({ ...bridge, now: () => clock }).record(source, sourceCatalogue.v, id, C.snapshotLines(sourceCatalogue.items, { 't-zero': '5' }), null, 0, false, '');
      } catch (error) { if (error.code !== 'invalid' && error.code !== 'permission-denied') throw error; }
      boundaryAts.push(window.__fake.dump()[sourceKey + '/orders/' + id]?.at ?? null);
    }
    const boundaryPrevious = await store.history(target, 1);
    const targetDelivery = bridge.day(bridge.now() + 3 * 86400000), sourceDelivery = bridge.day(bridge.now() + 86400000), orderDay = bridge.day(bridge.now());
    const targetOrder = await store.record(target, targetCatalogue.v, 'previous', C.snapshotLines(targetCatalogue.items, { 't-stock': '4 kg' }), { day: orderDay, cutoffId: target }, 0, false, targetDelivery);
    const sourceOrder = await store.record(source, sourceCatalogue.v, 'separate-dry-order', C.snapshotLines(sourceCatalogue.items, { 't-zero': '3' }), { day: orderDay, cutoffId: source }, 0, false, sourceDelivery);
    const first = await store.history(target, 1), second = await store.history(target, 1, first.cursor), third = second.more ? await store.history(target, 1, second.cursor) : { rows: [] };
    const supplier = await store.load(target), fields = { historyFrom: supplier.historyFrom, historyBefore: supplier.historyBefore };
    const amended = supplier.items.map(item => item.id === 't-stock' ? { ...item, par: '23' } : item);
    const edited = await store.saveCatalogue(target, supplier.v, { items: amended }, { itemId: 't-stock', action: 'edit' });
    const currentSource = await store.load(source);
    await store.saveCatalogue(source, currentSource.v, { name: 'Current dry supplier label' }, { action: 'settings' });
    const lagging = window.LK_SUP_STORE.create({ ...bridge, now: () => sourceAt - 1000 });
    const renamedSource = await lagging.load(source);
    const laggingSaved = await lagging.saveCatalogue(source, renamedSource.v, { name: renamedSource.name }, { action: 'settings' });
    const laggingRecorded = await lagging.record(source, laggingSaved.v, 'later-dry-after-edit', C.snapshotLines(laggingSaved.items, { 't-zero': '6' }), null, 0, false, '');
    const ownAfterEdit = await store.history(target, 1), inheritedAfterEdit = await store.history(target, 1, ownAfterEdit.cursor);
    const beforeRepeat = JSON.stringify(window.__fake.dump());
    await store.importCatalogue(incoming, { [source]: source, [target]: target });
    return {
      inherited: inherited.rows, inheritedReads, afterDry: stillInherited.rows, boundaryPrevious: boundaryPrevious.rows, boundaryAts,
      targetOrder: targetOrder.order, sourceOrder: sourceOrder.order,
      pages: [first, second, third].map(value => ({ ids: value.rows.map(row => row.id), qty: value.rows.map(row => row.lines.map(line => line.qty)), more: value.more })),
      fields, edited: { historyFrom: edited.historyFrom, historyBefore: edited.historyBefore, par: edited.items.find(item => item.id === 't-stock').par },
      lagging: { catalogueAt: laggingSaved.at, orderAt: laggingRecorded.order.at, inheritedId: inheritedAfterEdit.rows[0]?.id },
      repeatedUnchanged: JSON.stringify(window.__fake.dump()) === beforeRepeat,
      sourceName: window.__fake.dump()[sourceKey].name, latest: (await store.history(target, 1)).rows
    };
  }, { source: SOURCE, target: TARGET, sourceKey, targetKey, sourceAt: splitAt, incoming: payload() });
  ok(direct.inherited[0]?.id === 'from:' + SOURCE + ':previous' && direct.inherited[0]?.inheritedFrom === SOURCE && direct.inherited[0]?.sourceOrderId === 'previous', 'inherited history has unambiguous source provenance and a namespaced UI ID');
  ok(direct.inherited[0]?.lines.length === 2 && direct.inherited[0].lines.find(line => line.itemId === 't-stock')?.qty === '2 kg', 'history projection includes only target item quantities from the original order');
  ok(direct.inheritedReads.length === 2 && direct.inheritedReads.every(read => read.n <= 2), 'latest inherited history uses the two bounded own and parent queries with no per-item read loop');
  ok(direct.afterDry[0]?.id === direct.inherited[0]?.id, 'a newer dry-goods order after the split cannot replace inherited seafood quantities');
  ok(direct.boundaryPrevious[0]?.id === direct.inherited[0]?.id && direct.boundaryAts.every(at => at === null || at > splitAt), 'later source orders from same-time and lagging clocks cannot enter the original inherited history');
  ok(direct.targetOrder.sid === TARGET && direct.sourceOrder.sid === SOURCE && direct.targetOrder.cutoffId === TARGET && direct.sourceOrder.cutoffId === SOURCE && direct.targetOrder.deliveryDay !== direct.sourceOrder.deliveryDay, 'separate real orders keep their own supplier, reminder and delivery date');
  ok(direct.pages[0].ids[0] === 'previous' && direct.pages[1].ids[0] === 'from:' + SOURCE + ':previous' && direct.pages[2].ids[0] === 'from:' + SOURCE + ':older', 'pagination reads own orders before capped original history, including a colliding original order ID');
  ok(direct.latest[0]?.id === 'previous' && direct.latest[0]?.lines[0]?.qty === '4 kg', 'a real order for the new supplier takes over its previous quantity hint');
  ok(direct.edited.historyFrom === direct.fields.historyFrom && direct.edited.historyBefore === direct.fields.historyBefore && direct.edited.par === '23', 'ordinary par edits preserve immutable inherited-history metadata');
  ok(direct.lagging.catalogueAt > splitAt && direct.lagging.orderAt > direct.lagging.catalogueAt && direct.lagging.inheritedId === direct.inherited[0]?.id, 'lagging source settings edits and subsequent orders keep monotonic times outside inherited history');
  ok(direct.repeatedUnchanged && direct.sourceName === 'Current dry supplier label', 're-importing the split preserves edited live pars, the current source label and original history cutoff without another revision');
  const afterDirect = await dump(page);
  ok(afterDirect[F.key(['supplierlinks', F.today + '_' + SOURCE])]?.sid === SOURCE && afterDirect[F.key(['supplierlinks', F.today + '_' + TARGET])]?.sid === TARGET, 'independent recorded orders have separate occurrence links');
  await page.context().close();

  page = await open(browser);
  await splitDirect(page);
  const incremental = await page.evaluate(async ({ source, target, sourceKey, targetKey, incoming }) => {
    const store = window.__splitStore, supplier = await store.load(source), C = window.LK_SUP_CORE;
    await store.record(source, supplier.v, 'later-still-active-item', C.snapshotLines(supplier.items, { 't-zero': '9' }), null, 0, false, '');
    const inherited = (await store.history(target, 1)).rows;
    const zero = incoming.suppliers[0].items.find(item => item.id === 't-zero');
    incoming.suppliers[0].items = incoming.suppliers[0].items.filter(item => item.id !== zero.id);
    incoming.suppliers[1].items.push(zero);
    const before = JSON.stringify(window.__fake.dump());
    let code;
    try { await store.importCatalogue(incoming); code = 'saved'; }
    catch (error) { code = error.code; }
    return { code, unchanged: JSON.stringify(window.__fake.dump()) === before,
      inheritedUnchanged: JSON.stringify((await store.history(target, 1)).rows) === JSON.stringify(inherited),
      targetIds: window.__fake.dump()[targetKey].items.map(item => item.id), sourceActive: !window.__fake.dump()[sourceKey].items.find(item => item.id === zero.id).archived };
  }, { source: SOURCE, target: TARGET, sourceKey, targetKey, incoming: payload() });
  ok(incremental.code === 'invalid' && incremental.unchanged && incremental.inheritedUnchanged && incremental.sourceActive && !incremental.targetIds.includes('t-zero'), 'an existing split cannot absorb another parent item after its immutable history boundary');
  await page.context().close();

  page = await open(browser);
  await splitDirect(page);
  const thirdIncoming = payload(), third = 'northside-another-child';
  const parentItem = clone(F.items.find(item => item.id === 't-stock'));
  thirdIncoming.suppliers[1] = { id: third, name: 'Another test supplier', cutoffId: '', splitFrom: SOURCE, items: [parentItem] };
  const beforeThird = supplierRecords(await dump(page)), thirdResult = await refusal(page, thirdIncoming);
  ok(thirdResult === 'invalid' && supplierRecords(await dump(page)) === beforeThird, 'an archived parent item active in one child cannot be split into another child');
  await page.evaluate(({ key, targetKey }) => {
    window.__fake.dump()[key] = { ...JSON.parse(JSON.stringify(window.__fake.dump()[targetKey])), name: 'Conflicting existing test child', cutoffId: '' };
  }, { key: F.key(['suppliers', third]), targetKey });
  const beforeConflict = supplierRecords(await dump(page)), conflict = await refusal(page, payload());
  ok(conflict === 'invalid' && supplierRecords(await dump(page)) === beforeConflict, 'an existing destination cannot hide an active third-owner collision during split retry');
  await page.context().close();

  const futureParent = fixture(), futureAt = L.NOW + 60000;
  futureParent[sourceKey + '/orders/latest-ahead-clock'] = clone(futureParent[sourceKey + '/orders/previous']);
  futureParent[sourceKey + '/orders/latest-ahead-clock'].at = futureAt;
  const futureStock = futureParent[sourceKey + '/orders/latest-ahead-clock'].lines.find(line => line.itemId === 't-stock');
  Object.assign(futureStock, { qty: '11 kg', amount: 11 });
  page = await open(browser, 390, futureParent);
  const beforeFuture = historicalRecords(await dump(page));
  await splitDirect(page);
  const futureInherited = await page.evaluate(async target => {
    const store = window.__splitStore, supplier = await store.load(target), history = await store.history(target, 1);
    return { before: supplier.historyBefore, rows: history.rows };
  }, TARGET);
  ok(futureInherited.before >= futureAt && futureInherited.rows[0]?.sourceOrderId === 'latest-ahead-clock' && futureInherited.rows[0]?.lines.find(line => line.itemId === 't-stock')?.qty === '11 kg', 'a first split includes the latest original order when its device clock was ahead');
  ok(historicalRecords(await dump(page)) === beforeFuture, 'raising a split history boundary leaves ahead-clock original orders unchanged');
  await page.context().close();

  const emptyLatest = fixture();
  const originalOrder = clone(emptyLatest[sourceKey + '/orders/previous']), dry = emptyLatest[sourceKey].items.find(item => item.id === 't-zero');
  emptyLatest[sourceKey + '/orders/latest-dry-only'] = { ...originalOrder, at: L.NOW - 10000, lines: [{ itemId: dry.id, name: dry.name, pack: dry.pack, qty: '9', amount: 9, unit: '', par: dry.par, parUnit: dry.parUnit, source: dry.source, suggestion: '', stock: '' }] };
  page = await open(browser, 390, emptyLatest);
  await importThroughUI(page); await action(page, 'order-mode'); await selectSupplier(page, TARGET);
  await L.waitFor(page, () => /2 kg/.test(document.querySelector('[data-item="t-stock"] .su-last')?.textContent || ''), null, 10000);
  const empty = await page.evaluate(async target => (await window.LK_SUP_STORE.create(window.LK_PREP.supplier()).history(target, 1)).rows, TARGET);
  ok(empty[0]?.sourceOrderId === 'latest-dry-only' && empty[0]?.lines.length === 0, 'an original latest order without moved items stays an empty projection rather than pulling older quantities forward');
  ok(await page.$eval(qty('t-stock'), element => element.placeholder) === '2 kg' && !!(await page.$('[data-item="t-stock"] .su-last time')), 'the separate sheet shows the item\'s earlier recorded purchase and date without treating it as part of the latest batch');
  await action(page, 'history');
  await L.waitFor(page, () => !!document.querySelector('.su-history-dates'), null, 5000);
  ok(!(await page.$('[data-su="reuse"]:not([disabled])')), 'an empty inherited projection cannot offer a live reuse-quantities action');
  await page.context().close();

  for (const variant of ['missing-source', 'wrong-lineage', 'chained-source', 'undeclared-move', 'refused-write']) {
    let extra = fixture(), incoming = payload();
    if (variant === 'missing-source') incoming.suppliers = incoming.suppliers.filter(supplier => supplier.id !== SOURCE);
    if (variant === 'wrong-lineage') extra[targetKey] = { name: 'Existing unrelated supplier', cutoffId: TARGET, v: 1, at: L.NOW - 1000, by: 'bo', items: clone(F.items.filter(item => movedIds.includes(item.id))), historyFrom: 'west-bay', historyBefore: L.NOW - 2000 };
    if (variant === 'chained-source') { extra[sourceKey].historyFrom = 'west-bay'; extra[sourceKey].historyBefore = L.NOW - 2000; extra[sourceKey].at = L.NOW - 1000; }
    if (variant === 'undeclared-move') delete incoming.suppliers.find(supplier => supplier.id === TARGET).splitFrom;
    page = await open(browser, 390, extra);
    const before = supplierRecords(await dump(page));
    if (variant === 'refused-write') await page.evaluate(key => { window.__fake.deny = new RegExp('^' + key + '$'); }, targetKey);
    const result = await refusal(page, incoming);
    ok(result !== 'saved' && supplierRecords(await dump(page)) === before, variant + ': refused split leaves every catalogue, audit and order unchanged');
    await page.context().close();
  }

  page = await open(browser);
  const stale = await page.evaluate(async ({ incoming, sourceKey, targetKey }) => {
    const bridge = window.LK_PREP.supplier(), before = JSON.stringify(window.__fake.dump()[sourceKey].items);
    let changed = false;
    const delayed = { ...bridge, transact(fs, db, callback, options) {
      if (!changed) { changed = true; window.__fake.dump()[sourceKey].v++; }
      return bridge.transact(fs, db, callback, options);
    } };
    let code;
    try { await window.LK_SUP_STORE.create(delayed).importCatalogue(incoming); code = 'saved'; }
    catch (error) { code = error.code; }
    return { code, targetAbsent: !window.__fake.dump()[targetKey], auditAbsent: !window.__fake.dump()[sourceKey + '/audit/2'], sourceItemsKept: JSON.stringify(window.__fake.dump()[sourceKey].items) === before };
  }, { incoming: payload(), sourceKey, targetKey });
  ok(stale.code === 'stale' && stale.targetAbsent && stale.auditAbsent && stale.sourceItemsKept, 'a source revision changed after planning cannot create a half-split or overwrite the other device');
  const context = await page.evaluate(async incoming => {
    const bridge = window.LK_PREP.supplier(), ready = await bridge.ready();
    let phase = 'original-person', release;
    const waiting = new Promise(resolve => { release = resolve; });
    const store = window.LK_SUP_STORE.create({ ...bridge, ready: () => waiting, context: () => phase });
    const before = JSON.stringify(window.__fake.dump()), attempt = store.importCatalogue(incoming).then(() => 'saved', error => error.code);
    phase = 'other-person'; release(ready);
    return { code: await attempt, unchanged: JSON.stringify(window.__fake.dump()) === before };
  }, payload());
  ok(context.code === 'context' && context.unchanged, 'a delayed split does not continue under a different person context');
  await page.context().close();
  page = await open(browser, 390, fixture(), 'sam');
  const sousBefore = supplierRecords(await dump(page)), sous = await refusal(page, payload());
  ok(sous === 'permission' && supplierRecords(await dump(page)) === sousBefore, 'sous chefs cannot split supplier catalogues through the store API');
  await page.context().close(); await browser.close(); L.report(R);
})().catch(error => { console.log(R.join('\n')); console.error(error); process.exit(1); });
