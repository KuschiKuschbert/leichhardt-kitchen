// Replacement templates change the active list, while saved purchasing records keep their IDs and history.
// Suppliers, products, people and files in these checks are synthetic.
const L = require('./lib');
const F = require('./supplier-fixtures');
const { R, ok } = L.results();
const clone = value => JSON.parse(JSON.stringify(value));
const SOURCE = 'northside', TARGET = 'northside-separate';
const sourceKey = F.key(['suppliers', SOURCE]), targetKey = F.key(['suppliers', TARGET]);
const moved = ['t-stock', 't-case', 't-zero', 't-safe', 't-long'];
const mapped = { 't-stock': 'saved-stock', 't-case': 'saved-case', 't-zero': 't-zero', 't-safe': 't-safe', 't-long': 't-long' };
const action = (page, name) => L.choose(page, '[data-su="' + name + '"]');
const dump = page => page.evaluate(() => __fake.dump());
const records = value => JSON.stringify(Object.entries(value).filter(([key]) => /\/suppliers(?:\/|$)/.test(key)).sort(([a], [b]) => a.localeCompare(b)));
const history = value => JSON.stringify(Object.entries(value).filter(([key]) => /\/orders\//.test(key)).sort(([a], [b]) => a.localeCompare(b)));
const active = supplier => supplier.items.filter(item => !item.archived).map(item => item.id);
function ordinaryFixture() {
  const extra = clone(F.fixture()), items = extra[sourceKey].items;
  items.find(item => item.id === 't-stock').par = '19.50';
  items.find(item => item.id === 't-stock').orderUnit = 'ctns';
  delete items.find(item => item.id === 't-stock').aliases;
  delete items.find(item => item.id === 't-stock').archived;
  items.find(item => item.id === 't-zero').archived = true;
  const manual = clone(items.find(item => item.id === 't-unset'));
  manual.id = 'saved-manual'; manual.name = 'TEST SAVED MANUAL PRODUCT'; manual.manual = true;
  manual.source = { file: '', page: 0, row: 0, name: '', par: '' };
  items.push(manual);
  return extra;
}
function ordinaryPayload(replace = true) {
  const stock = clone(F.items[0]), zero = clone(F.items[1]), archived = clone(F.items[3]), added = clone(F.items[2]);
  archived.archived = true;
  added.id = 'new-template-product'; added.name = added.source.name = 'TEST NEW TEMPLATE PRODUCT';
  const supplier = { id: SOURCE, name: 'Northside Test Foods', cutoffId: SOURCE, items: [stock, zero, archived, added] };
  if (replace) supplier.replaceItems = true;
  return { version: 1, suppliers: [supplier] };
}
function splitFixture() {
  const extra = clone(F.fixture()), source = extra[sourceKey];
  source.items[0].par = '19.50';
  const stock = clone(source.items[0]), cases = clone(source.items[3]);
  stock.id = mapped['t-stock']; stock.par = '44.50'; delete stock.aliases;
  cases.id = mapped['t-case']; cases.par = '7';
  const other = clone(source.items[2]); other.id = 'saved-extra'; other.name = other.source.name = 'TEST SAVED EXTRA PRODUCT';
  extra[targetKey] = { name: 'Northside Test Seafood', cutoffId: TARGET, v: 4, at: L.NOW - 3 * 86400000, by: 'bo', items: [cases, stock, other] };
  const own = clone(extra[sourceKey + '/orders/previous']);
  own.sid = TARGET; own.supplierName = extra[targetKey].name; own.v = 4; own.at = L.NOW - 86400000;
  own.lines = [{ ...own.lines[0], itemId: stock.id, qty: '11 kg', amount: 11, par: stock.par, source: clone(stock.source) }];
  extra[targetKey + '/orders/previous'] = own;
  extra[F.key(['config', 'main'])].cutoffs.push({ id: TARGET, name: extra[targetKey].name, dd: [(new Date(L.NOW).getDay() + 3) % 7], at: 660, pre: 1, lead: 180 });
  return extra;
}
function splitPayload(replace = true) {
  const original = clone(F.items), suppliers = [
    { id: SOURCE, name: 'Northside Test Dry Goods', cutoffId: SOURCE, items: original.filter(item => !moved.includes(item.id)) },
    { id: TARGET, name: 'Northside Test Seafood', cutoffId: TARGET, splitFrom: SOURCE,
      items: moved.map(id => { const item = original.find(item => item.id === id); if (replace) item.archived = !['t-stock', 't-case'].includes(id); return item; }) }
  ];
  if (replace) suppliers.forEach(supplier => { supplier.replaceItems = true; });
  return { version: 1, suppliers };
}
async function open(browser, extra, width = 390) {
  const page = await L.open(browser, '#/suppliers/' + SOURCE, { who: 'bo', width, extra, wait: 1000 });
  await L.waitFor(page, () => !!document.querySelector('input[data-sf="qty"]'), null, 10000);
  return page;
}
async function direct(page, incoming) {
  return page.evaluate(async incoming => {
    const store = LK_SUP_STORE.create(LK_PREP.supplier()); window.__replacementStore = store;
    try { return { saved: await store.importCatalogue(incoming) }; }
    catch (error) { return { code: error.code, message: error.message }; }
  }, incoming);
}
async function preview(page, incoming) {
  await action(page, 'manage');
  await page.setInputFiles('[data-sf="import"]', { name: 'synthetic-replacement.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(incoming)) });
  await L.waitFor(page, () => /Review catalogue import/.test(document.querySelector('#rtitle')?.textContent || '') || !!document.querySelector('[role="alert"]'), null, 5000);
  return /Review catalogue import/.test(await L.txt(page, '#rtitle'));
}
async function visibleStatus(page) {
  return page.evaluate(() => {
    const element = document.querySelector('#su-import-status'); if (!element) return { text: '', visible: false };
    const box = element.getBoundingClientRect(); return { text: element.textContent, visible: box.top >= 0 && box.bottom <= innerHeight };
  });
}

(async () => {
  const browser = await L.start();
  let page = await open(browser, ordinaryFixture());
  const before = await dump(page), result = await direct(page, ordinaryPayload());
  ok(!!result.saved, 'an explicit replacement file is accepted: ' + (result.message || 'saved'));
  if (result.saved) {
    const after = await dump(page), saved = after[sourceKey];
    ok(active(saved).join() === 't-stock,t-zero,new-template-product', 'only active template rows remain on the current list and their file order is retained');
    ok(saved.items.length === before[sourceKey].items.length + 1 && before[sourceKey].items.every(item => saved.items.some(row => row.id === item.id)), 'omitted and explicitly archived products retain their original stored IDs instead of being deleted');
    ok(saved.items.find(item => item.id === 'saved-manual').archived && saved.items.find(item => item.id === 't-long').archived && saved.items.find(item => item.id === 't-case').archived, 'replacement archives omitted manual rows and saved PDF rows plus listed history-only rows');
    ok(saved.items.find(item => item.id === 't-zero').archived === false, 'an included active template product is restored from a previous archive');
    ok(before[sourceKey].items.every(item => {
      const expected = { ...item }, archived = !active(saved).includes(item.id);
      if (!!item.archived !== archived) expected.archived = archived;
      return JSON.stringify(saved.items.find(row => row.id === item.id)) === JSON.stringify(expected);
    }), 'current pars, legacy units, aliases, source records and omitted fields survive exactly apart from the requested archive state');
    ok(history(after) === history(before) && JSON.stringify(after[F.key(['suppliers', 'west-bay'])]) === JSON.stringify(before[F.key(['suppliers', 'west-bay'])]), 'replacement leaves every recorded order and an untargeted supplier unchanged');
    ok(!Object.hasOwn(saved, 'replaceItems') && !Object.hasOwn(after[sourceKey + '/audit/' + saved.v].after, 'replaceItems'), 'the replacement instruction is never stored in supplier records or audit snapshots');
    const unchanged = records(after), repeated = await direct(page, ordinaryPayload());
    ok(!!repeated.saved && records(await dump(page)) === unchanged, 'repeating an unchanged replacement adds no revision, audit or order');
    const guard = await page.evaluate(async sid => {
      const store = window.__replacementStore, supplier = await store.load(sid), before = JSON.stringify(__fake.dump()), results = [];
      for (const change of [{ par: '99' }, { pack: 'A different current pack' }, { source: { ...supplier.items[0].source, row: 99 } }]) {
        try { await store.saveCatalogue(sid, supplier.v, { items: supplier.items.map(item => item.id === 't-stock' ? { ...item, ...change, archived: true } : item) }, { action: 'replace-import' }); results.push(false); }
        catch (_) { results.push(before === JSON.stringify(__fake.dump())); }
      }
      return results.every(Boolean);
    }, SOURCE);
    ok(guard, 'a direct replacement save cannot disguise a par, pack or source-data edit along with an archive');
  }
  const invalid = await page.evaluate(incoming => {
    return ['true', 1, null, [], {}].every(value => { const input = JSON.parse(JSON.stringify(incoming)); input.suppliers[0].replaceItems = value; try { LK_SUP_CORE.validateCatalogue(input); return false; } catch (_) { return true; } });
  }, ordinaryPayload());
  ok(invalid, 'replacement must be a real boolean rather than a truthy or malformed value');
  const explicitAdditive = await page.evaluate(incoming => {
    incoming.suppliers[0].replaceItems = false;
    try { return LK_SUP_CORE.validateCatalogue(incoming).suppliers[0].replaceItems === false; } catch (_) { return false; }
  }, ordinaryPayload());
  ok(explicitAdditive, 'an explicit false replacement flag remains an additive instruction');
  await page.context().close();

  page = await open(browser, ordinaryFixture());
  const legacyBefore = await dump(page), legacy = await direct(page, ordinaryPayload(false)), legacyAfter = await dump(page);
  ok(!!legacy.saved && legacyBefore[sourceKey].items.every(item => JSON.stringify(legacyAfter[sourceKey].items.find(row => row.id === item.id)) === JSON.stringify(item)), 'older additive files retain their existing raw items and archive states');
  await page.context().close();

  for (const newlyCreated of [false, true]) {
    page = await open(browser, ordinaryFixture());
    const stale = await page.evaluate(async ({ incoming, newlyCreated, otherKey }) => {
      const store = LK_SUP_STORE.create(LK_PREP.supplier()), all = await store.loadSuppliers();
      const versions = Object.fromEntries(all.map(supplier => [supplier.id, supplier.v]));
      const other = JSON.parse(JSON.stringify(__fake.dump()[otherKey]));
      const id = newlyCreated ? 'future-supplier' : 'west-bay';
      incoming.suppliers.push({ id, name: newlyCreated ? 'Future Test Supplier' : other.name, cutoffId: '', replaceItems: true, items: other.items.map(item => ({ ...item, id: newlyCreated ? 'future-product' : item.id })) });
      const key = otherKey.replace(/west-bay$/, id);
      const external = newlyCreated ? { ...other, name: 'Future Test Supplier', v: 1, items: incoming.suppliers[1].items } : { ...other, v: other.v + 1 };
      __fake.write(key, external); __fake.writes.length = 0;
      const before = JSON.stringify(__fake.dump());
      try { await store.importCatalogue(incoming, {}, versions); return { refused: false }; }
      catch (error) { return { refused: error.code === 'stale', unchanged: before === JSON.stringify(__fake.dump()), writes: __fake.writes.length }; }
    }, { incoming: ordinaryPayload(), newlyCreated, otherKey: F.key(['suppliers', 'west-bay']) });
    ok(stale.refused && stale.unchanged && stale.writes === 0, (newlyCreated ? 'a supplier created after review' : 'a later supplier revision') + ' stops every replacement before the first catalogue write');
    await page.context().close();
  }

  for (const priorAdditive of [false, true]) {
    page = await open(browser, splitFixture());
    const beforeSplit = await dump(page);
    let prior;
    if (priorAdditive) prior = await direct(page, splitPayload(false));
    const baseline = await dump(page), split = await direct(page, splitPayload());
    ok(!!split.saved && (!priorAdditive || !!prior.saved), (priorAdditive ? 'previously additive split' : 'existing separate catalogue') + ': replacement is accepted: ' + (split.message || 'saved'));
    if (split.saved) {
      const after = await dump(page), source = after[sourceKey], target = after[targetKey];
      ok(active(source).join() === 't-unset' && active(target).join() === 'saved-stock,saved-case', 'the separate current lists contain exactly their template products');
      ok(moved.every(id => source.items.find(item => item.id === id).archived) && target.items.find(item => item.id === 'saved-extra').archived, 'moved originals and the unlisted existing destination product are archived');
      ok(Object.keys(target.historyItems).length === 5 && moved.every(id => target.historyItems[id] === mapped[id] && target.items.some(item => item.id === mapped[id])), 'all five immutable history links remain complete even when only two destination products are active');
      ok(['t-zero', 't-safe', 't-long'].every(id => target.items.find(item => item.id === id).archived) && target.items.length === 6, 'three old split products remain available as archived records and are not added to the active list');
      ok(target.items.find(item => item.id === 'saved-stock').par === '44.50' && source.items.find(item => item.id === 't-stock').par === '19.50' && target.cutoffId === TARGET && source.cutoffId === SOURCE, 'split replacement retains both saved pars and separate existing delivery reminders');
      ok(history(after) === history(beforeSplit), 'replacement never rewrites destination or combined historical quantities');
      if (priorAdditive) ok(target.historyBefore === baseline[targetKey].historyBefore && JSON.stringify(target.historyItems) === JSON.stringify(baseline[targetKey].historyItems), 'replacing an already imported split keeps its original history boundary and complete map');
      const hints = await page.evaluate(async target => (await window.__replacementStore.history(target, 20)).rows, TARGET);
      ok(hints.some(order => order.id === 'previous' && order.lines.some(line => line.itemId === 'saved-stock' && line.qty === '11 kg')) && hints.some(order => order.sourceOrderId === 'previous' && order.lines.some(line => line.itemId === 'saved-case' && line.qty === '1 case')), 'own and inherited previous quantities remain available after replacement');
      const unchanged = records(after), again = await direct(page, splitPayload());
      ok(!!again.saved && records(await dump(page)) === unchanged, 'the exact same split replacement is a no-op on retry');
    }
    await page.context().close();
  }

  for (const width of [390, 768, 1280]) {
    page = await open(browser, ordinaryFixture(), width);
    await page.fill('input[data-sf="qty"][data-i="t-stock"]', '7 kg');
    const reviewed = await preview(page, ordinaryPayload());
    ok(reviewed, width + ': a replacement file opens the existing import review');
    if (reviewed) {
      const review = await L.txt(page, '.su-editor');
      ok(/replac/i.test(review) && /archiv/i.test(review), width + ': review explains that the current list is replaced and older products are archived');
      const originalOrders = history(await dump(page));
      await action(page, 'import-apply');
      await L.waitFor(page, () => !document.querySelector('[data-su="import-apply"]') || !!document.querySelector('[role="alert"]'), null, 8000);
      const status = await visibleStatus(page), after = await dump(page);
      ok(status.visible && /3 active items/.test(status.text) && active(after[sourceKey]).length === 3, width + ': acknowledged replacement shows its saved active count in view');
      ok(history(after) === originalOrders, width + ': the UI replacement preserves immutable purchasing history');
      await action(page, 'order-mode');
      await L.waitFor(page, () => !!document.querySelector('input[data-sf="qty"][data-i="new-template-product"]'), null, 5000);
      const displayed = await page.$$eval('.su-row', rows => rows.map(row => row.dataset.item));
      ok(displayed.join() === 't-stock,t-zero,new-template-product' && await page.inputValue('input[data-sf="qty"][data-i="t-stock"]') === '7 kg', width + ': current ordering shows only template rows and keeps the retained product draft');
      await action(page, 'refresh');
      await L.waitFor(page, () => !document.querySelector('[data-su="refresh"][disabled]') && !!document.querySelector('input[data-sf="qty"][data-i="new-template-product"]'), null, 6000);
      ok(active((await dump(page))[sourceKey]).length === 3 && !(await L.overflow(page)) && page.errors.length === 0, width + ': replacement state survives Refresh without overflow or browser errors');
      if (width === 390) {
        const unchanged = records(await dump(page));
        await preview(page, ordinaryPayload()); await action(page, 'import-apply');
        await L.waitFor(page, () => !document.querySelector('[data-su="import-apply"]'), null, 8000);
        const noOp = await visibleStatus(page);
        ok(noOp.visible && /already up to date|no changes/i.test(noOp.text) && records(await dump(page)) === unchanged, 'the replacement retry gives a visible no-change result without another audit');
      }
    }
    await page.context().close();
  }

  for (const field of ['qty', 'stock']) {
    page = await open(browser, ordinaryFixture());
    await page.fill('input[data-sf="' + field + '"][data-i="t-long"]', '4 packs');
    const reviewed = await preview(page, ordinaryPayload());
    if (reviewed) {
      const beforeDraft = records(await dump(page));
      await action(page, 'import-apply');
      await L.waitFor(page, () => !!document.querySelector('[role="alert"]'), null, 5000);
      const message = await L.txt(page, '[role="alert"]');
      ok(/TEST LONG PRODUCT/.test(message) && /record|clear/i.test(message) && records(await dump(page)) === beforeDraft, 'an unsent ' + field + ' draft on a product becoming archived is named and blocks replacement before writes');
      await page.evaluate(() => window.LK_SUP.back()); await page.evaluate(() => window.LK_SUP.back());
      await action(page, 'order-mode');
      ok(await page.inputValue('input[data-sf="' + field + '"][data-i="t-long"]') === '4 packs', 'the blocked archived-product ' + field + ' draft remains available to resolve');
    } else ok(false, 'the archived-product ' + field + ' draft can be reviewed before replacement');
    await page.context().close();
  }
  for (const replaceSource of [true, false]) {
    page = await open(browser, splitFixture());
    await page.fill('input[data-sf="qty"][data-i="t-zero"]', '4 packs');
    const incoming = splitPayload(); incoming.suppliers[0].replaceItems = replaceSource;
    const label = replaceSource ? 'both lists replacing' : 'only destination replacing';
    if (await preview(page, incoming)) {
      const beforeDraft = records(await dump(page));
      await page.evaluate(() => { __fake.writes.length = 0; });
      await action(page, 'import-apply');
      await L.waitFor(page, () => !!document.querySelector('[role="alert"]'), null, 5000);
      ok(/TEST ZERO PAR ITEM/.test(await L.txt(page, '[role="alert"]')) && records(await dump(page)) === beforeDraft && await page.evaluate(() => __fake.writes.length === 0), label + ': an original-supplier draft for a moved but archived template product blocks the paired replacement before writes');
      await page.evaluate(() => window.LK_SUP.back()); await page.evaluate(() => window.LK_SUP.back()); await action(page, 'order-mode');
      ok(await page.inputValue('input[data-sf="qty"][data-i="t-zero"]') === '4 packs', label + ': the refused split leaves the original archived-product draft available');
    } else ok(false, label + ': a moved archived-product draft can be reviewed before replacement');
    await page.context().close();
  }

  page = await open(browser, splitFixture());
  await page.fill('input[data-sf="qty"][data-i="t-stock"]', '7 kg');
  await page.fill('input[data-sf="stock"][data-i="t-stock"]', '3 kg');
  if (await preview(page, splitPayload())) {
    await action(page, 'import-apply');
    await L.waitFor(page, () => !document.querySelector('[data-su="import-apply"]') || !!document.querySelector('[role="alert"]'), null, 8000);
    const after = await dump(page);
    ok(active(after[targetKey]).join() === 'saved-stock,saved-case' && !(await page.$('[role="alert"]')), 'a source draft that remains active under the mapped destination does not block replacement');
    await action(page, 'order-mode');
    const pick = page.locator('[data-su="pick"][data-sid="' + TARGET + '"]');
    if (await pick.isVisible()) await pick.click(); else await L.pick(page, '[data-sf="supplier"]', TARGET);
    await L.waitFor(page, () => !!document.querySelector('input[data-sf="qty"][data-i="saved-stock"]'), null, 5000);
    ok(await page.inputValue('input[data-sf="qty"][data-i="saved-stock"]') === '7 kg' && await page.inputValue('input[data-sf="stock"][data-i="saved-stock"]') === '3 kg', 'the kept source quantity and counted-stock draft move to the existing destination product ID');
  } else ok(false, 'an active moved-product draft can be reviewed for replacement');
  await page.context().close();

  page = await open(browser, ordinaryFixture());
  if (await preview(page, ordinaryPayload())) {
    await page.evaluate(key => {
      const supplier = JSON.parse(JSON.stringify(__fake.dump()[key])), other = JSON.parse(JSON.stringify(supplier.items[2]));
      other.id = 'another-chef-product';
      other.name = other.source.name = 'TEST ANOTHER CHEF PRODUCT'; supplier.v++; supplier.items.push(other);
      __fake.write(key, supplier); __fake.writes.length = 0;
    }, sourceKey);
    const concurrent = records(await dump(page));
    await action(page, 'import-apply');
    await L.waitFor(page, () => !!document.querySelector('[role="alert"]'), null, 6000);
    ok(/changed on another device/i.test(await L.txt(page, '[role="alert"]')) && records(await dump(page)) === concurrent && await page.evaluate(() => __fake.writes.length === 0), 'a product added by another chef after review is not silently archived by applying the stale replacement');
    ok(!!(await page.$('[data-su="import-apply"]')), 'the refused stale replacement keeps its reviewed file available for an explicit retry');
  } else ok(false, 'the replacement review can be checked for a later competing catalogue edit');
  await page.context().close();
  await browser.close();
  L.report(R);
})().catch(error => { console.error(error); process.exit(1); });
